You **cannot** close another user's token account unless they explicitely sign the transaction. The SPL Token program enforces that the `authority` (the account owner) must sign the `closeAccount` instruction.

However, you **can** build a "Relayer API" where your server constructs the transaction and pays the gas fees (acting as the Fee Payer), but the user still signs it on their client. This is common for "gasless" applications.

Here is the complete workflow and code for this **Fee Relayer Pattern**.

### The Workflow
1.  **Client** sends a POST request with their Public Key and the Account to close.
2.  **Server** creates the transaction, sets itself as the `feePayer`, and partially signs it (authorizing the fee).
3.  **Server** returns the serialized transaction to the Client.
4.  **Client** signs the transaction (authorizing the closure).
5.  **Client** sends the fully signed transaction to the network (or back to the server to broadcast).

---

### 1. Backend API (Node.js / Express)
This endpoint creates the transaction and pays the fee.

```javascript
const express = require('express');
const { Connection, PublicKey, Transaction, Keypair } = require('@solana/web3.js');
const { createCloseAccountInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const bs58 = require('bs58'); // needed for decoding private keys

const app = express();
app.use(express.json());

// 1. Setup Connection & Relayer Wallet
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
// This wallet must have SOL to pay for the transaction fees
const relayerKeypair = Keypair.fromSecretKey(bs58.decode("YOUR_SERVER_PRIVATE_KEY_BASE58"));

app.post('/api/build-close-tx', async (req, res) => {
    const { userPublicKey, tokenAccountAddress } = req.body;

    if (!userPublicKey || !tokenAccountAddress) {
        return res.status(400).json({ error: "Missing keys" });
    }

    try {
        const userPubkey = new PublicKey(userPublicKey);
        const tokenPubkey = new PublicKey(tokenAccountAddress);

        // 2. Create the Close Instruction
        // authority: userPubkey (The user MUST sign this part later)
        // destination: userPubkey (Rent SOL goes back to user)
        const closeIx = createCloseAccountInstruction(
            tokenPubkey,    // Account to close
            userPubkey,     // Destination for rent
            userPubkey,     // Authority
            [],
            TOKEN_PROGRAM_ID
        );

        // 3. Create Transaction
        const transaction = new Transaction().add(closeIx);
        
        // 4. Set Relayer as Fee Payer
        transaction.feePayer = relayerKeypair.publicKey;
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        // 5. PARTIAL SIGN: Relayer signs to pay the fee
        transaction.partialSign(relayerKeypair);

        // 6. Serialize and return to client
        // requireAllSignatures: false (because the user hasn't signed yet)
        const serializedTx = transaction.serialize({ requireAllSignatures: false });
        
        res.json({ 
            transaction: serializedTx.toString('base64'),
            message: "Transaction built and fee paid. User signature required." 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Relayer API running on port 3000'));
```

### 2. Frontend Client (React / standard JS)
The user receives the transaction, signs it, and broadcasts it.

```javascript
import { Connection, Transaction } from '@solana/web3.js';

// Assuming you are using a wallet adapter (Phantom/Solflare)
async function closeAccountWithRelayer(wallet, tokenAccountAddress) {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    // 1. Request the transaction from your API
    const response = await fetch('https://your-api.com/api/build-close-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userPublicKey: wallet.publicKey.toString(),
            tokenAccountAddress: tokenAccountAddress
        })
    });

    const data = await response.json();
    const base64Tx = data.transaction;

    // 2. Deserialize the Transaction
    const txBuffer = Buffer.from(base64Tx, 'base64');
    const transaction = Transaction.from(txBuffer);

    // 3. User Signs the Transaction
    // The transaction already has the Relayer's signature for fees.
    // We just need the Authority (User) signature now.
    const signedTx = await wallet.signTransaction(transaction);

    // 4. Broadcast to Network
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    await connection.confirmTransaction(signature, "confirmed");
    console.log("Account Closed! Signature:", signature);
}
```

### Why this works
*   **Security:** The API never sees the user's Private Key. The User never sees the API's Private Key.
*   **Authority:** The instruction requires the Owner's signature. The Frontend script provides this via `wallet.signTransaction`.
*   **Fees:** The transaction requires a Fee Payer signature. The API provides this via `transaction.partialSign(relayerKeypair)`.