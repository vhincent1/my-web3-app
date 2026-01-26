import appConfig from '../../app.config.ts';

import { Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';

// --- Connection Setup ---
const connection = appConfig.CONNECTION;

async function withdraw(fromWallet: Keypair, toWallet: PublicKey, AMOUNT_TO_SEND_SOL: number) {
  try {
    console.log(`Attempting to withdraw ${AMOUNT_TO_SEND_SOL} SOL from ${fromWallet.publicKey.toString()} to ${toWallet.toString()}`);

    // Calculate lamports (1 SOL = 1,000,000,000 lamports)
    const lamportsToSend = AMOUNT_TO_SEND_SOL * LAMPORTS_PER_SOL;

    // Create the transfer instruction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: toWallet,
        lamports: lamportsToSend,
      }),
    );

    // Sign and send the transaction
    // The `fromWallet` keypair is used to sign as both the fee payer and the transfer authority
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromWallet], // Signers array must include the sender's keypair
    );

    let message = `Withdrawal successful. Transaction signature: ${signature}\n`;
    message += `View on Explorer: https://explorer.solana.com{signature}?cluster=${connection.rpcEndpoint}`;
    return message;
  } catch (error) {
    console.error('Withdrawal failed:', error.message);
    throw error;
  }
}

export { withdraw };
