use solana_program::declare_id;

declare_id!("8pRUcpXfWot7uhCyF8pH4ebz48hReW83VXwPzSh14DKy");

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

// 1. Define Account State
// This is what is stored in the account data on-chain.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct MotdState {
    pub is_initialized: bool, // New flag (1 byte)
    pub admin: Pubkey,
    pub message: String,
}

// 2. Define Instructions
// Variant 0 = Initialize, Variant 1 = Update
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum MotdInstruction {
    Initialize { message: String },
    Update { message: String },
}

// 3. Entrypoint
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Deserialize the incoming instruction
    let instruction = MotdInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        MotdInstruction::Initialize { message } => {
            process_initialize(program_id, accounts, message)
        }
        MotdInstruction::Update { message } => process_update(program_id, accounts, message),
    }
}
const MAX_MESSAGE_LEN: usize = 512;


fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    message: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let state_account = next_account_info(account_info_iter)?;
    let signer = next_account_info(account_info_iter)?;

    if !signer.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if state_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }
    if message.len() > MAX_MESSAGE_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }

    msg!("Initialize process");
    {
        let data = state_account.data.borrow();

        // Print the first 5 bytes to the logs
        if data.len() >= 5 {
            msg!("Raw Data: {:?}", &data[0..5]);
        }

        if let Ok(state) = MotdState::try_from_slice(&data) {
            msg!("Parsed Init Flag: {}", state.is_initialized);
        }

        // 2. The Fix: Use a slice reference
        let mut data_slice: &[u8] = &data;

        // 3. Attempt to deserialize
        // This will work even if there are 200 unused zeros at the end.
        if let Ok(existing_state) = MotdState::deserialize(&mut data_slice) {
            msg!("Reading");
            // 4. Now we can check the flag
            if existing_state.is_initialized {
                msg!("Error: Account is already initialized.");
                return Err(ProgramError::AccountAlreadyInitialized);
            }
        } else {
            msg!("Garbage");
        }

        let data = state_account.data.borrow();
        msg!("Account Data Length: {}", data.len());
        if data.len() > 0 {
            // Print the first 5 bytes (Is the first one 0 or 1?)
            msg!("First byte (is_initialized): {}", data[0]);
        }
    }

    // Simplified init: Assuming account is already created/rent-exempt by client
    // We just write the initial data.
    let state_data = MotdState {
        is_initialized: true, // SET TO TRUE
        admin: *signer.key,
        message: message,
    };

    state_data.serialize(&mut *state_account.data.borrow_mut())?;
    Ok(())
}

fn process_update(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_message: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let state_account = next_account_info(account_info_iter)?;
    let signer = next_account_info(account_info_iter)?;
    msg!("process_update");

    // --- 1. READ & VERIFY ---
    // We must read the account's current state to verify permissions.
    let mut state_data: MotdState;
    {
        let data = state_account.data.borrow();
        let mut data_slice: &[u8] = &data;

        // Deserialize to check is_initialized and admin
        state_data = MotdState::deserialize(&mut data_slice)
            .map_err(|_| ProgramError::InvalidAccountData)?;

        if !state_data.is_initialized {
            msg!("Already initialized");
            return Err(ProgramError::UninitializedAccount);
        }
        if state_data.admin != *signer.key {
            msg!("Signer is not the admin");
            return Err(ProgramError::IllegalOwner);
        }
    } // Read lock is dropped here

    // --- 2. PRE-WRITE CHECKS ---
    // Ensure the new message fits in the allocated space to prevent a panic.
    let required_space = 1 + 32 + 4 + new_message.len();
    if required_space > state_account.data_len() {
        return Err(ProgramError::AccountDataTooSmall);
    }

    // --- 3. MODIFY IN-MEMORY STATE ---
    // Change the message in our temporary Rust struct.
    state_data.message = new_message;

    // --- 4. SERIALIZE & WRITE BACK ---
    // This is the step you're asking about.
    // We commit the modified `state_data` struct back to the blockchain account.
    {
        // 1. Get a "Write Lock" on the account's data buffer.
        let mut data = state_account.data.borrow_mut();

        // 2. Call serialize.
        // It takes the `state_data` struct and turns it back into a byte array,
        // writing those bytes into the `data` buffer, starting from the beginning.
        state_data.serialize(&mut *data)?;
    } // Write lock is dropped here

    msg!(&("Success: Message updated. to ".to_owned() + &state_data.message));
    Ok(())
}
