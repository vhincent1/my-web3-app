import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import fs from 'node:fs';
import path from 'node:path';

const GENERATE = true;

const loadKeypair = (filePath: string, print: boolean = false) => {
  if (!GENERATE) {
    console.error('Disabled: generate constant is set to false');
    return;
  }

  let secretKeyString: string | undefined;
  try {
    secretKeyString = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error) console.error('error reading keypair file:', filePath, error.message);
    process.exit(1);
  }
  const secretKeyArray = JSON.parse(secretKeyString);
  const secretKeyUint8Array = Uint8Array.from(secretKeyArray);
  const loadedKeypair = Keypair.fromSecretKey(secretKeyUint8Array);
  if (print) console.log(`Loaded keypair=${filePath} address=${loadedKeypair.publicKey.toBase58()}`);
  return { filePath, keypair: loadedKeypair };
};

const generateKeypair = (filename?) => {
  const keypair = Keypair.generate();
  if (!filename) filename = keypair.publicKey.toBase58();
  console.log(`New Public Key (address): ${keypair.publicKey.toBase58()}`);
  // 2. Get the secret key as a Uint8Array
  const secretKeyUint8Array = keypair.secretKey;
  // 3. Convert the Uint8Array to a standard JSON array format
  const secretKeyArray = Array.from(secretKeyUint8Array);
  // 4. Define the file path (e.g., in the current directory)
  const savePath = './config/' + filename + '-keypair.json';
  // 5. Write the secret key array to a JSON file
  fs.writeFileSync(savePath, JSON.stringify(secretKeyArray));
  logKeypair(keypair);
  return keypair;
};

const logKeypair = async (keypair: Keypair) => {
  const dirPath = path.join(path.resolve(), 'logs');
  const logFile = path.join(dirPath, 'generated-keypairs.json');
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {}

  await appendJsonToFile(logFile, {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey.toString(),
  });
};

const appendJsonToFile = async (filePath, append) => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([append], null, 2));
      return;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const jsonArray = JSON.parse(data);
    if (!Array.isArray(jsonArray)) {
      console.error('JSON file does not contain an array. Cannot append.');
      return;
    }

    const isDupe = jsonArray.some((data) => data.publicKey === append.publicKey);
    if (isDupe) {
      console.log('Dupe entry');
      return;
    }
    jsonArray.push(append);
    const updatedJsonString = JSON.stringify(jsonArray, null, 2);
    fs.writeFileSync(filePath, updatedJsonString, 'utf8');

    console.log('Logged keypair:', append.publicKey);
  } catch (error) {
    // Handle errors (e.g., file not found, invalid JSON, permission issues)
    console.error('Error handling JSON file:', error.message);
  }
};

// const options: any = {
//   port: { alias: 'p', type: 'number', desc: 'client port', default: null },
// };

const keypairUtils = {
  generateKeypair,
  loadKeypair,
  logKeypair,
};

async function withdraw(connection: Connection, from: Keypair, to: PublicKey, amount: number) {
  try {
    console.info(`Attempting to withdraw ${amount} SOL from ${from.publicKey.toString()} to ${to.toString()}`);

    // Calculate lamports (1 SOL = 1,000,000,000 lamports)
    const lamportsToSend = amount * LAMPORTS_PER_SOL;

    // Create the transfer instruction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: lamportsToSend,
      }),
    );

    // Sign and send the transaction
    // The `fromWallet` keypair is used to sign as both the fee payer and the transfer authority
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [from], // Signers array must include the sender's keypair
    );

    let message = `Withdrawal successful. Transaction signature: ${signature}\n`;
    message += `View on Explorer: https://explorer.solana.com{signature}?cluster=${connection.rpcEndpoint}`;
    return message;
  } catch (error) {
    console.error('Withdrawal failed:', error.message);
    throw error;
  }
}

export const requestAirdrop = async (connection: Connection, recipientPublicKey: PublicKey, amount: number) => {
  // 1. Establish a connection to the Devnet cluster
  // const connection = appConfig.CONNECTION//new Connection('https://api.devnet.solana.com' /*devnet*/, 'confirmed');
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

const accountDetails = async (connection: Connection, publicKey: PublicKey) => {
  // Fetch the balance in lamports
  const balanceInLamports = await connection.getBalance(publicKey);
  // Convert lamports to SOL
  const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;
  console.log(`The balance for public key ${publicKey.toBase58()} is ${balanceInSol} SOL`);
};

const getTokenBalance = async (connection: Connection, ownerPublicKey: PublicKey, tokenMintAddress: string) => {
  //   const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

  // Find the associated token account
  // Note: For newer @solana/spl-token library versions, the method might be slightly different.
  // This uses a generic RPC call approach from search results.
  const response = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, { mint: new PublicKey(tokenMintAddress) }, 'confirmed');

  if (response.value.length > 0) {
    const accountInfo = response.value[0].account.data.parsed.info;
    const tokenBalance = accountInfo.tokenAmount.uiAmount;
    console.log(`Token Balance: ${tokenBalance}`);
    return tokenBalance;
  } else {
    console.log('No token account found for this mint and owner.');
    return 0;
  }
};

async function displayWalletTokens(connection: Connection, walletAddress: PublicKey) {
  try {
    const ownerPublicKey = walletAddress; //new PublicKey(walletAddress);

    // Use getTokenAccountsByOwner to get all token accounts owned by the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(ownerPublicKey, {
      // Filter by the SPL Token program ID to get only token accounts
      // programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      programId: TOKEN_PROGRAM_ID,
    });

    console.log(`Found ${tokenAccounts.value.length} token account(s) for wallet ${walletAddress}:`);

    // Iterate through the results and extract relevant data
    tokenAccounts.value.forEach((tokenAccount, index) => {
      // The `info` field contains parsed data if you use an RPC that supports it (e.g., Helius, Quicknode)
      // Otherwise, you might need to manually parse the `data` buffer.
      const accountInfo = tokenAccount.account.data.parsed.info;

      console.log(`\nAccount Index: ${index + 1}`);
      console.log(`  Token Account Address: ${tokenAccount.pubkey.toBase58()}`);
      console.log(`  Mint Address (Token ID): ${accountInfo.mint}`);
      // console.log(`  Balance (Raw Amount): ${accountInfo.tokenAmount.amount}`);
      console.log(`  Balance (Formatted): ${accountInfo.tokenAmount.uiAmountString}`);
    });
  } catch (error) {
    console.error('Error fetching SPL tokens:', error);
  }
}

async function getTransactionLamports(connection: Connection, signature: string) {
  try {
    // Fetch the parsed transaction details
    const txDetails = await connection.getParsedTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0, // Ensure compatibility with versioned transactions
    });

    if (!txDetails) {
      console.log('Transaction not found or could not be parsed.');
      return;
    }

    if (txDetails.meta == null) return;

    // Access the balance changes
    const preBalances = txDetails.meta.preBalances;
    const postBalances = txDetails.meta.postBalances;
    const accountKeys = txDetails.transaction.message.accountKeys;

    console.log('--- Account Balance Changes (in Lamports) ---');
    // Iterate over accounts to show the change
    accountKeys.forEach((account, index) => {
      const balanceChange = postBalances[index] - preBalances[index];
      if (balanceChange !== 0) {
        console.log(`Account: ${account.pubkey.toBase58()}`);
        // console.log(`Change: ${balanceChange.toLocaleString()} lamports`);
        console.log(`Change (SOL): ${balanceChange / LAMPORTS_PER_SOL} SOL\n`);
      }
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
  }
}

async function getAllSignaturesForProgram(connection, programId) {
  let signatures = [];
  let options: any = { limit: 1000 };
  let fetchedSignatures = [];

  // Loop to handle the 1000 transaction limit
  do {
    fetchedSignatures = await connection.getSignaturesForAddress(programId, options);
    signatures.push(...fetchedSignatures);

    // If we fetched the maximum number, use the oldest signature as the 'before' cursor for the next request
    if (fetchedSignatures.length === 1000) {
      options.before = fetchedSignatures[fetchedSignatures.length - 1].signature;
    }
  } while (fetchedSignatures.length === 1000);

  return signatures;
}

async function getTransactionDetails(connection, signatures, programId) {
  // getParsedTransactions accepts an array of signatures (limit is usually around 10 per call)
  const transactions = await connection.getParsedTransactions(
    signatures.map((s) => s.signature),
    {
      maxSupportedTransactionVersion: 0, // Use version 0 for modern transactions
    },
  );

  // Filter transactions to ensure they involve the correct program, as getSignaturesForAddress
  // only guarantees the program's address was mentioned, not necessarily the *target* of an instruction
  return transactions.filter((tx) => {
    if (!tx || !tx.transaction.message.instructions) return false;
    return tx.transaction.message.instructions.some((ix) => {
      // For parsed instructions, programId will be a PublicKey
      if (ix.programId.equals(programId)) return true;
      // Handle legacy unparsed instructions if necessary
      return false;
    });
  });
}

// async function main() {
//     console.log(`Fetching signatures for program: ${programId.toBase58()}`);
//     const signatures = await getAllSignaturesForProgram(programId);
//     console.log(`Found ${signatures.length} transactions. Fetching details...`);

//     // Process in batches due to potential RPC limits on getParsedTransactions
//     const BATCH_SIZE = 10;
//     const allTransactions = [];
//     for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
//         const batchSignatures = signatures.slice(i, i + BATCH_SIZE);
//         const transactions = await getTransactionDetails(batchSignatures);
//         allTransactions.push(...transactions);
//         console.log(`Fetched batch ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)}/${Math.ceil(signatures.length / BATCH_SIZE)}`);
//     }

//     console.log(`Total transactions fetched and filtered: ${allTransactions.length}`);
//     // You can now process allTransactions for specific instruction data
//     // console.log(JSON.stringify(allTransactions[0], null, 2)); 
// }

const solanaUtils = {
  requestAirdrop,
  accountDetails,
  displayWalletTokens,
  getTransactionLamports,
  withdraw,
  getAllSignaturesForProgram,
};

export { keypairUtils, solanaUtils };
