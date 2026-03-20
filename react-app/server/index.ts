import express from 'express';
import cors from 'cors';
import { PublicKey } from '@solana/web3.js';
// import dotenv from 'dotenv';

// dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8000;

// Example Endpoint: Verify a wallet address
app.get('/api/validate/:address', (req, res) => {
  try {
    const pubkey = new PublicKey(req.params.address);
    const isOnCurve = PublicKey.isOnCurve(pubkey.toBytes());
    console.log('verified');
    res.json({ valid: true, address: pubkey.toBase58(), isOnCurve });
  } catch (e) {
    res.status(400).json({ valid: false, error: 'Invalid Public Key' });
  }
});

// Example Endpoint: Trigger your Monolithic Program
app.post('/api/mint', (req, res) => {
  const { userAddress, amount } = req.body;
  console.log(`Backend received request to mint ${amount} to ${userAddress}`);
  // In a real app, you'd trigger your Native Rust program logic here via a system wallet
  res.json({ status: 'Processing' });
});


import closeAccountRoute from './closeAccounts.ts';
app.use(closeAccountRoute);

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
