The answer below provides a complete implementation for two common scenarios:

1.  **Client-Side Creation (Relayer Pattern):** The client creates/signs the transaction and sends it to your API to broadcast. (Best for "gasless" transactions or logging).
2.  **Server-Side Creation:** The API builds the transaction and sends it to the client to sign. (Best if your server needs to decide *which* account to close).

### Scenario 1: Client Creates & Signs -> Sends to API (Relayer)

This is the most common pattern if you want your backend to broadcast the transaction or pay the fees.

#### 1. Client-Side Code (Frontend)
```javascript
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createCloseAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';

async function signAndSendToAPI(wallet, tokenAccountAddress) {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const tokenPubkey = new PublicKey(tokenAccountAddress);

    // 1. Create the Close Instruction
    // The "destination" (2nd arg) must be the user's wallet to receive the rent SOL
    const closeInst = createCloseAccountInstruction(
        tokenPubkey,       // Account to close
        wallet.publicKey,  // Destination for rent SOL
        wallet.publicKey,  // Authority (Owner)
        [],
        TOKEN_PROGRAM_ID
    );

    // 2. Build Transaction
    const transaction = new Transaction().add(closeInst);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey; 

    // 3. Sign the Transaction (User approves in Wallet)
    // Note: If you want the API to pay fees, you would not sign here, 
    // you'd send the raw transaction to the API to sign as feePayer first.
    await wallet.signTransaction(transaction);

    // 4. Serialize to Base64
    const serializedTx = transaction.serialize();
    const base64Tx = serializedTx.toString('base64');

    // 5. POST to your API
    const response = await fetch('https://your-api.com/broadcast-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: base64Tx })
    });

    const data = await response.json();
    console.log("Tx Signature:", data.signature);
}
```

#### 2. API-Side Code (Backend - Node.js/Express)
```javascript
const express = require('express');
const { Connection, Transaction } = require('@solana/web3.js');
const app = express();

app.use(express.json());
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

app.post('/broadcast-close', async (req, res) => {
    try {
        const { transaction } = req.body;

        // 1. Decode the transaction
        const txBuffer = Buffer.from(transaction, 'base64');
        
        // 2. Send Raw Transaction to Solana Network
        // The API acts as a relay. The user already signed it.
        const signature = await connection.sendRawTransaction(txBuffer);

        // 3. Confirm (Optional - waits for network confirmation)
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        res.json({ success: true, signature, confirmation });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});
```

---

### Scenario 2: API Builds Transaction -> Sends to Client
Use this if your server logic determines which account needs to be closed, but the user (owner) must still sign it.

#### 1. API-Side Code (Backend)
```javascript
app.post('/create-close-tx', async (req, res) => {
    const { userPublicKey, tokenAccountAddress } = req.body;
    
    // 1. Setup keys
    const userKey = new PublicKey(userPublicKey);
    const tokenKey = new PublicKey(tokenAccountAddress);

    // 2. Create Instruction
    const ix = createCloseAccountInstruction(
        tokenKey,
        userKey, // Destination
        userKey, // Authority
        [],
        TOKEN_PROGRAM_ID
    );

    // 3. Create Transaction Object
    const transaction = new Transaction().add(ix);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userKey;

    // 4. Serialize PARTIALLY (Unsigned)
    // We serialize the "Message" so the client can reconstruct it
    const serializedTx = transaction.serialize({ requireAllSignatures: false });
    
    res.json({ 
        transaction: serializedTx.toString('base64'),
        message: "Please sign this transaction to close your account."
    });
});
```

#### 2. Client-Side Code (Frontend)
```javascript
async function requestCloseTxFromAPI(wallet, tokenAccountAddress) {
    // 1. Request the constructed transaction from API
    const response = await fetch('https://your-api.com/create-close-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            userPublicKey: wallet.publicKey.toString(),
            tokenAccountAddress 
        })
    });
    
    const { transaction: base64Tx } = await response.json();

    // 2. Deserialize the Transaction
    const txBuffer = Buffer.from(base64Tx, 'base64');
    const transaction = Transaction.from(txBuffer);

    // 3. Sign & Send
    const signature = await wallet.sendTransaction(transaction, connection);
    console.log("Closed!", signature);
}
```