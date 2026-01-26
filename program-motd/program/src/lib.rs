use borsh::{ BorshDeserialize, BorshSerialize };
use solana_program::{
    account_info::{ next_account_info, AccountInfo },
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    sysvar::Sysvar,
    sysvar::rent::Rent,
};
use solana_system_interface::instruction as system_instruction;

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
    Initialize {
        message: String,
    },
    Update {
        message: String,
    },
}

// 3. Entrypoint
entrypoint!(process_instruction);

macro_rules! event {
    ($($arg:tt)*) => {
        #[cfg(feature = "debug")]
        // We use format! inside msg! to handle multiple arguments securely
        msg!("EVENT: {}", format!($($arg)*));
    };
}

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8]
) -> ProgramResult {
    // Deserialize the incoming instruction
    let instruction = MotdInstruction::try_from_slice(instruction_data).map_err(
        |_| ProgramError::InvalidInstructionData
    )?;

    match instruction {
        MotdInstruction::Initialize { message } => {
            process_initialize(program_id, accounts, message)
        }
        MotdInstruction::Update { message } => { process_update(program_id, accounts, message) }
    }
}

const MY_SEED: &[u8] = b"motd";
const MAX_MESSAGE_LEN: usize = 512;

pub fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    message: String
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    // Accounts expected:
    // 0. [signer, writable] Payer (Admin)
    // 1. [writable] PDA Account (Motd State)
    // 2. [] System Program
    let payer = next_account_info(accounts_iter)?;
    let pda_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    event!("Process_initialize");
    // message exceeds length
    if message.len() > MAX_MESSAGE_LEN {
        return Err(ProgramError::AccountDataTooSmall);
    }
    // 3. Derive PDA to verify and get the bump seed
    // We use "motd" as the static seed
    let (pda, bump_seed) = Pubkey::find_program_address(&[MY_SEED], program_id);

    // Security Check: Ensure the account passed in is actually the valid PDA
    if pda != *pda_account.key {
        event!("Invalid seed");
        return Err(ProgramError::InvalidSeeds);
    }

    // 4. Create the Account (If it doesn't have data yet)
    if pda_account.data_len() == 0 {
        // Calculate Space:
        // 1 (bool) + 32 (Pubkey) + 4 (String len overhead) + 200 (String content) = ~237 bytes
        let space = 1 + 32 + 4 + 200;
        let rent = Rent::get()?.minimum_balance(space);

        // Construct the System Program instruction to create an account
        let create_ix = system_instruction::create_account(
            payer.key,
            pda_account.key,
            rent,
            space as u64,
            program_id // Important: We assign ownership to THIS program
        );

        // INVOKE SIGNED: This is the magic.
        // The program signs for the PDA using the seeds.
        invoke_signed(
            &create_ix,
            &[payer.clone(), pda_account.clone(), system_program.clone()],
            &[&[b"motd".as_ref(), &[bump_seed]]]
        )?;
        event!("Created PDA account");
    } else {
        event!("Process_init check");

        let data = pda_account.data.borrow();
        // 2. The Fix: Use a slice reference
        let mut data_slice: &[u8] = &data;

        // 3. Attempt to deserialize
        // This will work even if there are 200 unused zeros at the end.
        if let Ok(existing_state) = MotdState::deserialize(&mut data_slice) {
            event!("Reading");
            // 4. Now we can check the flag
            if existing_state.is_initialized {
                event!("Error: Account is already initialized.");
                return Err(ProgramError::AccountAlreadyInitialized);
            }
        } else {
            event!("Garbage");
        }
    }

    event!("PDA Account {}", pda_account.key);

    // 5. Initialize State
    let state = MotdState {
        is_initialized: true,
        admin: *payer.key,
        message: message,
    };

    // Write to the account
    state.serialize(&mut *pda_account.data.borrow_mut())?;

    Ok(())
}

fn process_update(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_message: String
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    // Accounts: [Signer (Admin), PDA (State)]
    let admin_account = next_account_info(accounts_iter)?;
    let pda_account = next_account_info(accounts_iter)?;

    event!("Process_Update");
    // A. Security Checks
    if !admin_account.is_signer {
        event!("Signer is not the admin");
        return Err(ProgramError::MissingRequiredSignature);
    }
    if pda_account.owner != program_id {
        event!("Already initialized");
        return Err(ProgramError::InvalidAccountData);
    }

    // // B. Load Current State
    // 1. Borrow the data
    let mut data = pda_account.data.borrow_mut();
    // 2. Create a mutable slice reference
    // We need this because 'deserialize' advances the slice position as it reads
    let mut data_slice: &[u8] = &data;
    // 3. Deserialize safely
    // This works even if the account is 1000 bytes but your data is only 50 bytes.
    let mut state = MotdState::deserialize(&mut data_slice).map_err(
        |_| ProgramError::InvalidAccountData
    )?;

    // C. Verify Admin Permission
    if state.admin != *admin_account.key {
        event!("Signer {} is not the admin {}", admin_account.key, state.admin);
        return Err(ProgramError::IllegalOwner);
    }

    // D. Update Data
    state.message = new_message;

    // E. Serialize back to the account
    // Note: This fails if the new message is longer than the allocated space
    state.serialize(&mut *data)?;
    event!("updated message: {}", state.message);
    Ok(())
}