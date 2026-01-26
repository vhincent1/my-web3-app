To add simple staking, we need to introduce two new concepts to your architecture:

1.  **A Vault (PDA):** A secure Token Account owned by the program where the staked tokens will sit.
2.  **State Account:** A storage account to remember *who* staked, *how much*, and *when*.

Here is how to extend your Anchor program to support **Staking** (Deposit) and **Unstaking** (Withdraw with a time lock).

### 1. The Rust Program (`lib.rs`)

We will add two new functions: `stake` and `unstake`, and a new account struct `StakeInfo`.

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("YOUR_PROGRAM_ID_HERE");

#[program]
pub mod simple_staking {
    use super::*;

    // ... (Your existing buy_token code here) ...

    // 1. STAKE: User deposits tokens into the vault
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        // A. Record the stake data
        let stake_info = &mut ctx.accounts.stake_info;
        let clock = Clock::get()?;

        if stake_info.amount > 0 {
            return err!(ErrorCode::AlreadyStaked);
        }

        stake_info.owner = ctx.accounts.signer.key();
        stake_info.amount = amount;
        stake_info.stake_at = clock.unix_timestamp;

        // B. Move tokens from User -> Program Vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(),
            authority: ctx.accounts.signer.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    // 2. UNSTAKE: User withdraws tokens if time has passed
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let stake_info = &ctx.accounts.stake_info;
        let clock = Clock::get()?;

        // A. Enforce Time Lock (e.g., 60 seconds)
        if clock.unix_timestamp - stake_info.stake_at < 60 {
            return err!(ErrorCode::TooEarly);
        }

        // B. Sign for the vault to release funds
        // The Vault Authority is a PDA derived from b"vault"
        let seeds = &[
            b"vault".as_ref(),
            &[ctx.bumps.token_vault], 
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.token_vault.to_account_info(), // The PDA is the auth
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), 
            cpi_accounts, 
            signer
        );
        
        token::transfer(cpi_ctx, stake_info.amount)?;

        // C. The account closes automatically due to the `close = signer` attribute below
        // This refunds the rent to the user and prevents double-withdrawing.
        Ok(())
    }
}

// --- DATA STRUCTURES ---

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    // The vault to hold tokens. It is a PDA owned by the program.
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = token_vault // The account itself is its own authority
    )]
    pub token_vault: Account<'info, TokenAccount>,

    // Where we store the "receipt" of the stake
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 8 + 8, // Discriminator + Pubkey + u64 + i64
        seeds = [b"stake", signer.key().as_ref()],
        bump
    )]
    pub stake_info: Account<'info, StakeInfo>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        close = signer, // IMPORTANT: Closes account & refunds rent after success
        seeds = [b"stake", signer.key().as_ref()],
        bump,
        constraint = stake_info.owner == signer.key(),
        constraint = stake_info.amount > 0
    )]
    pub stake_info: Account<'info, StakeInfo>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct StakeInfo {
    pub owner: Pubkey,
    pub amount: u64,
    pub stake_at: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You have already staked.")]
    AlreadyStaked,
    #[msg("Stake is still locked. Please wait.")]
    TooEarly,
}
```

### 2. Client-Side (TypeScript)

Here is how you interact with the new functions.

```typescript
import * as anchor from "@project-serum/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";

async function testStaking() {
    const provider = anchor.AnchorProvider.env();
    const program = anchor.workspace.SimpleStaking;
    const mint = new anchor.web3.PublicKey("YOUR_MINT_ADDRESS");

    // 1. Derive PDAs
    const [vaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("vault"), mint.toBuffer()],
        program.programId
    );

    const [stakeInfoPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from("stake"), provider.wallet.publicKey.toBuffer()],
        program.programId
    );

    // 2. Get User's Token Account
    const userTokenAccount = await getAssociatedTokenAddress(
        mint,
        provider.wallet.publicKey
    );

    // --- STAKE ---
    console.log("Staking...");
    await program.methods
        .stake(new anchor.BN(1000000000)) // 1 Token
        .accounts({
            signer: provider.wallet.publicKey,
            userTokenAccount: userTokenAccount,
            mint: mint,
            tokenVault: vaultPda,
            stakeInfo: stakeInfoPda,
            systemProgram: anchor.web3.SystemProgram.programId,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
    console.log("Staked!");

    // --- UNSTAKE ---
    // Wait for 60 seconds, then call this:
    console.log("Unstaking...");
    await program.methods
        .unstake()
        .accounts({
            signer: provider.wallet.publicKey,
            userTokenAccount: userTokenAccount,
            mint: mint,
            tokenVault: vaultPda,
            stakeInfo: stakeInfoPda,
            tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();
    console.log("Unstaked!");
}
```

### Key Mechanisms Used

1.  **The Vault (`token_vault`):**
    *   This is a Token Account, but it has no private key.
    *   The `authority` is set to itself (the PDA).
    *   This allows the program to sign transactions moving funds *out* of the vault using `seeds`.
2.  **Close Instruction (`close = signer`):**
    *   In the `Unstake` struct, we add `close = signer`.
    *   This automatically deletes the `stake_info` storage account from the blockchain after the function finishes successfully.
    *   **Benefit 1:** The user gets their rent SOL back (about 0.002 SOL).
    *   **Benefit 2:** It prevents re-entrancy attacks (you can't unstake twice because the record is deleted immediately).