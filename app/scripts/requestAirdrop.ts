import appConfig from '../app.config.ts'

import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// import {loadKeypair} from './keypair.ts';

export const requestAirdrop = async (recipientPublicKey: PublicKey, amount: number) => {
  // 1. Establish a connection to the Devnet cluster
  const connection = appConfig.CONNECTION//new Connection('https://api.devnet.solana.com' /*devnet*/, 'confirmed');
  // 2. Define the recipient's public key (replace with your own test wallet address)
  // const recipientPublicKey = loadKeypair().publicKey;
  // 3. Define the amount of SOL to airdrop (e.g., 1 SOL in lamports)
  const airdropAmountLamports = amount * LAMPORTS_PER_SOL; // LAMPORTS_PER_SOL is 1,000,000,000
  try {
    // 4. Request the airdrop
    console.log(`Requesting airdrop of ${airdropAmountLamports / LAMPORTS_PER_SOL} SOL to ${recipientPublicKey.toBase58()}...`);
    const signature = await connection.requestAirdrop(recipientPublicKey, airdropAmountLamports);

    // 5. Confirm the transaction (recommended for reliability)
    console.log('Airdrop requested, waiting for confirmation...');
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      signature: signature,
    });

    console.log(`Airdrop confirmed! Transaction signature: ${signature}`);
    console.log(`View on Explorer: https://explorer.solana.com/tx/${signature}?cluster=${connection.rpcEndpoint}`);
  } catch (error) {
    console.error('Airdrop failed:', error);
    // Common errors include rate limits (HTTP 429).
  }
};
