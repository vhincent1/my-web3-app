This requires a **"Vending Machine"** architecture.

Here is the high-level logic:
1.  **The User** invokes your program.
2.  **The Program** performs a **Cross-Program Invocation (CPI)** to the System Program to transfer 0.0001 SOL from the User to a Treasury wallet.
3.  **The Program** signs (using a PDA) a CPI to the Token Program to mint 1 token to the user.

You will need **Anchor Framework** installed.

### 1. The Rust Program (`lib.rs`)

This program assumes you have created a Mint and transferred the **Mint Authority** to a PDA (Program Derived Address) controlled by this program.

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_lang::system_program;

declare_id!("YOUR_PROGRAM_ID_HERE");

#[program]
pub mod token_vending_machine {
    use super::*;

    pub fn buy_token(ctx: Context<BuyToken>) -> Result<()> {
        // 1. Define the cost: 0.0001 SOL = 100,000 Lamports
        const COST_IN_LAMPORTS: u64 = 100_000;
        const AMOUNT_TO_MINT: u64 = 1 * 1_000_000_000; // Assuming 9 decimals

        // 2. Transfer SOL from User to Treasury
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, COST_IN_LAMPORTS)?;

        // 3. Mint Token to User
        // We need the seeds to sign for the mint authority PDA
        let seeds = &["mint_authority".as_bytes(), &[ctx.bumps.mint_authority]];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::mint_to(cpi_ctx, AMOUNT_TO_MINT)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct BuyToken<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    // The token mint we are selling
    #[account(mut)]
    pub mint: Account<'info, Mint>,

    // The PDA that has authority to mint tokens
    // Derived from string "mint_authority"
    #[account(
        seeds = [b"mint_authority"], 
        bump
    )]
    /// CHECK: This is the PDA that authorizes the minting
    pub mint_authority: UncheckedAccount<'info>,

    // The user's token account (ATA) where they receive the token
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    // Where the 0.0001 SOL goes
    /// CHECK: This is the wallet collecting the SOL. Be careful in production to validate this address.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
```

---

### 2. The Setup (Crucial)

Before this code works, you must perform a setup script (usually in your tests or a migration script) to give the program permission to mint.

1.  Create a standard SPL Token Mint using your wallet.
2.  Calculate the PDA for your program: `findProgramAddress(["mint_authority"], programId)`.
3.  **Transfer the Mint Authority** of that token from your wallet to that PDA.

If you skip this, the program will fail with an "Unauthorized" error because it cannot sign for the mint.

---

### 3. The Client-Side (TypeScript)

Here is how you call the function from your frontend or test file.

```typescript
import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { 
    TOKEN_PROGRAM_ID, 
    getAssociatedTokenAddress 
} from "@solana/spl-token";

// ... verify your provider and program setup ...

async function purchaseToken() {
  const mintAddress = new anchor.web3.PublicKey("YOUR_MINT_ADDRESS");
  const treasuryWallet = new anchor.web3.PublicKey("YOUR_WALLET_TO_RECEIVE_SOL");

  // 1. Find the PDA for the mint authority
  const [mintAuthorityPda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("mint_authority")],
    program.programId
  );

  // 2. Get User's ATA (Associated Token Account)
  // Note: If this doesn't exist, you must add an instruction to create it first!
  const buyerTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    provider.wallet.publicKey
  );

  // 3. Call the Transaction
  await program.methods
    .buyToken()
    .accounts({
      buyer: provider.wallet.publicKey,
      mint: mintAddress,
      mintAuthority: mintAuthorityPda,
      buyerTokenAccount: buyerTokenAccount,
      treasury: treasuryWallet,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Success! Paid 0.0001 SOL and received token.");
}
```

### Key Security Notes for Production
1.  **Treasury Validation:** In the Rust code above, `treasury` is `UncheckedAccount`. In a real app, you should hardcode the treasury Pubkey in the program or check `constraint = treasury.key() == ADMIN_KEY` to prevent a user from swapping the treasury address to their own wallet and paying themselves.
2.  **Decimals:** Ensure `AMOUNT_TO_MINT` matches the decimals of your mint. If your mint has 9 decimals, `1 * 10^9` equals 1 Token. If it has 0 decimals (like an NFT), use `1`.