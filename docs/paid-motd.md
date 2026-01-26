Writing a Solana program without Anchor (using "Native" or "Raw" Rust) requires you to handle **serialization**, **account validation**, and **instruction dispatch** manually. It is much more verbose but gives you full control.

Here is the complete implementation of the **Paid Message of the Day** using raw `solana_program`.

### 1. `Cargo.toml` (Dependencies)
You need these standard crates.

```toml
[package]
name = "raw_motd"
version = "0.1.0"
edition = "2021"

[dependencies]
solana-program = "1.14"
borsh = "0.10"
thiserror = "1.0"
spl-token = { version = "4.0", features = ["no-entrypoint"] }
```

### 2. The Rust Program (`src/lib.rs`)

In raw Solana, you must manually deserialize the incoming byte array (`instruction_data`) to figure out what function to run, and manually iterate through the `accounts` array.

```rust
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    sysvar::Sysvar,
};
use spl_token::instruction::transfer;

// 1. Define State (Stored in the Account)
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct MotdState {
    pub is_initialized: bool,
    pub accepted_mint: Pubkey,
    pub treasury_vault: Pubkey,
    pub price: u64,
    pub message: String,
}

// 2. Define Instructions (Inputs)
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum MotdInstruction {
    /// Accounts expected:
    /// 0. [writable] state_account (to be initialized)
    /// 1. [] mint_account
    /// 2. [] treasury_account (must match mint)
    Initialize { price: u64, message: String },

    /// Accounts expected:
    /// 0. [writable] state_account
    /// 1. [writable] user_token_source
    /// 2. [writable] treasury_target
    /// 3. [signer] user_authority
    /// 4. [] token_program
    UpdateMessage { message: String },
}

// 3. Entrypoint
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Unpack the instruction data
    let instruction = MotdInstruction::try_from_slice(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;

    match instruction {
        MotdInstruction::Initialize { price, message } => {
            process_initialize(program_id, accounts, price, message)
        }
        MotdInstruction::UpdateMessage { message } => {
            process_update(program_id, accounts, message)
        }
    }
}

// --- LOGIC: INITIALIZE ---
fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    price: u64,
    message: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let state_account = next_account_info(account_info_iter)?;
    let mint_account = next_account_info(account_info_iter)?;
    let treasury_account = next_account_info(account_info_iter)?;

    // Security: Check ownership
    if state_account.owner != program_id {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Security: Deserialize to check if already initialized
    let mut state_data = MotdState::try_from_slice(&state_account.data.borrow())?;
    if state_data.is_initialized {
        return Err(ProgramError::AccountAlreadyInitialized);
    }

    // Save Data
    state_data.is_initialized = true;
    state_data.accepted_mint = *mint_account.key;
    state_data.treasury_vault = *treasury_account.key;
    state_data.price = price;
    state_data.message = message;

    state_data.serialize(&mut *state_account.data.borrow_mut())?;

    msg!("Initialized MOTD!");
    Ok(())
}

// --- LOGIC: UPDATE ---
fn process_update(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    new_message: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    
    let state_account = next_account_info(account_info_iter)?;
    let user_token_source = next_account_info(account_info_iter)?;
    let treasury_target = next_account_info(account_info_iter)?;
    let user_authority = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // 1. Deserialize State to get price and config
    let mut state_data = MotdState::try_from_slice(&state_account.data.borrow())?;

    // 2. Security Validations
    if !user_authority.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }
    if state_data.treasury_vault != *treasury_target.key {
        return Err(ProgramError::InvalidAccountData); // Trying to pay wrong wallet
    }
    if new_message.len() > 200 {
        return Err(ProgramError::InvalidInstructionData);
    }

    // 3. CPI: Transfer Tokens
    msg!("Transferring {} tokens...", state_data.price);
    
    // Construct the SPL Instruction manually
    let transfer_ix = transfer(
        token_program.key,
        user_token_source.key,
        treasury_target.key,
        user_authority.key,
        &[],
        state_data.price,
    )?;

    // Invoke the SPL Token Program
    invoke(
        &transfer_ix,
        &[
            user_token_source.clone(),
            treasury_target.clone(),
            user_authority.clone(),
            token_program.clone(),
        ],
    )?;

    // 4. Update State
    state_data.message = new_message;
    state_data.serialize(&mut *state_account.data.borrow_mut())?;

    msg!("Message Updated!");
    Ok(())
}
```

---

### 3. Client-Side (TypeScript)

Without Anchor, we don't have an IDL or methods builder (`program.methods...`). We must manually construct the `Buffer` for the instruction data and the `Transaction`.

You will need `borsh` installed in your JS project:
`npm install borsh @solana/web3.js @solana/spl-token`

```typescript
import * as borsh from 'borsh';
import { 
    Connection, 
    PublicKey, 
    Transaction, 
    TransactionInstruction, 
    sendAndConfirmTransaction, 
    Keypair 
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// 1. Define Schema for Serialization (Must match Rust Structs)
class UpdateMessageArgs {
    instruction: number = 1; // 1 = Update (Enum variant index)
    message: string;
    constructor(fields: {message: string}) {
        this.message = fields.message;
    }
}

const UpdateSchema = new Map([
    [UpdateMessageArgs, { kind: 'struct', fields: [['instruction', 'u8'], ['message', 'string']] }]
]);

async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    // Assume you have loaded your keypair
    const userWallet = Keypair.fromSecretKey(Uint8Array.from([...])); 

    const PROGRAM_ID = new PublicKey("YOUR_PROGRAM_ID");
    const STATE_ACCOUNT = new PublicKey("YOUR_STATE_ACCOUNT_PUBKEY");
    const TREASURY_VAULT = new PublicKey("TREASURY_TOKEN_ACCOUNT");
    const USER_ATA = new PublicKey("USER_TOKEN_ACCOUNT");

    // 2. Serialize Data
    const args = new UpdateMessageArgs({ message: "Hello from Raw Solana!" });
    const buffer = borsh.serialize(UpdateSchema, args);
    // Note: If using simple enums, sometimes you just push the index: 
    // const data = Buffer.alloc(1 + msgLen); data[0] = 1; ...

    // 3. Create Instruction
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: STATE_ACCOUNT, isSigner: false, isWritable: true },
            { pubkey: USER_ATA, isSigner: false, isWritable: true },
            { pubkey: TREASURY_VAULT, isSigner: false, isWritable: true },
            { pubkey: userWallet.publicKey, isSigner: true, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: PROGRAM_ID,
        data: Buffer.from(buffer),
    });

    // 4. Send
    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(connection, tx, [userWallet]);
    console.log("Tx Signature:", sig);
}
```

### Major Differences from Anchor

1.  **Instruction Enum:** In Rust, you must manually define `enum MotdInstruction` and match the index (0 for Initialize, 1 for Update). In the Client, you must serialize this index as the first byte of your data buffer.
2.  **Serialization:** You have to use `BorshDeserialize` explicitly on `accounts.data` inside the Rust code.
3.  **Account Ordering:** In Anchor, you name your accounts (e.g., `ctx.accounts.signer`). In Raw Solana, you access them by index (e.g., `next_account_info(iter)?`). **Order is critical.** If your client sends keys in the wrong order, your program will crash or act unpredictably.
4.  **Checks:** Anchor automatically checks `owner`, `is_signer`, and `is_writable` based on your macros. In Raw Solana, you must write `if !user.is_signer { return Err(...) }` manually.