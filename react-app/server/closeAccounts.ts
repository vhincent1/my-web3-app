import express from 'express';
import { Connection } from '@solana/web3.js';

const app = express.Router();

app.post('/api/relay-transaction', async (req, res) => {
  const { signedTx, owner } = req.body;
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    // 1. Convert the Base64 string back to binary Buffer
    const buffer = Buffer.from(signedTx, 'base64');

    // 2. Broadcast the transaction to the cluster
    // 'sendRawTransaction' accepts the already-signed byte array
    const signature = await connection.sendRawTransaction(buffer, {
      skipPreflight: false, // Set to true if you want to skip server-side simulation
      preflightCommitment: 'confirmed',
    });

    console.log(`Transaction relayed for ${owner}: ${signature}`);

    // 3. Wait for confirmation (optional but recommended)
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: signature,
    });

    // Fetch data to calculate refund
    const txDetails = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (txDetails && txDetails.meta) {
      const pre = txDetails.meta.preBalances;
      const post = txDetails.meta.postBalances;

      // Find accounts that were closed (balance dropped to 0)
      const refund = pre.reduce((acc, val, i) => {
        return val > 0 && post[i] === 0 ? acc + val : acc;
      }, 0);

      console.log(`Signature: ${signature} | Refunded: ${refund / 1e9} SOL`);
    }

    res.json({ success: true, signature });
  } catch (err) {
    console.error('Relay Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default app;
