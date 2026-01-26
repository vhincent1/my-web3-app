import { TOKEN_PROGRAM_ID, closeAccount } from '@solana/spl-token';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';

const GENERATE = false;

export const CLI_KEYPAIR_PATH = '/Users/vhincent/.config/solana/id.json';

export const OWNER_KEYPAIR_PATH = './config/owner-keypair.json';
export const MULE_KEYPAIR_PATH = './config/mule-keypair.json';

export const TREASURY_KEYPAIR_PATH = './config/treasury-keypair.json';
export const PROGRAM_KEYPAIR_PATH = './config/program-keypair.json';
export const USER_KEYPAIR_PATH = './config/user-keypair.json';

const generateKeypair = (filename = 'wallet-keypair') => {
  if (!GENERATE) {
    console.error('Disabled: generate constant is set to false');
    return;
  }

  // 1. Generate a new random keypair
  const keypair = Keypair.generate();
  console.log(`New Public Key (address): ${keypair.publicKey.toBase58()}`);
  // 2. Get the secret key as a Uint8Array
  const secretKeyUint8Array = keypair.secretKey;
  // 3. Convert the Uint8Array to a standard JSON array format
  const secretKeyArray = Array.from(secretKeyUint8Array);
  // 4. Define the file path (e.g., in the current directory)
  const savePath = './config/' + filename + '-keypair.json';
  // 5. Write the secret key array to a JSON file
  fs.writeFileSync(savePath, JSON.stringify(secretKeyArray));
  console.log(`Keypair saved to ${savePath}`);
};

const loadKeypair = (filePath = OWNER_KEYPAIR_PATH) => {
  // 1. Read the file content
  let secretKeyString: string | undefined;
  try {
    secretKeyString = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error) console.error('error reading keypair file:', filePath, error.message);
    process.exit(1);
  }
  // 2. Parse the JSON array into a JavaScript array of numbers
  const secretKeyArray = JSON.parse(secretKeyString);
  // 3. Convert the array back to a Uint8Array
  const secretKeyUint8Array = Uint8Array.from(secretKeyArray);
  // 4. Create a Keypair instance
  const loadedKeypair = Keypair.fromSecretKey(secretKeyUint8Array);
  console.log(`Loaded ${filePath} Public Key (address): ${loadedKeypair.publicKey.toBase58()}`);
  return loadedKeypair;
};

const accountDetails = async (connection: Connection, publicKey: PublicKey) => {
  // Fetch the balance in lamports
  const balanceInLamports = await connection.getBalance(publicKey);
  // Convert lamports to SOL
  const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;
  console.log(`The balance for public key ${publicKey.toBase58()} is ${balanceInSol} SOL`);
};

const requestAirdrop = async (connection: Connection, publicKey: PublicKey) => {
  // 1. Establish a connection to the Devnet cluster
  // Note: The requestAirdrop method only works on Devnet and Testnet, not Mainnet Beta.
  // const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // 2. Define the recipient's public key
  // Replace with the actual public key you want to airdrop to
  // const publicKey = new PublicKey('YOUR_WALLET_PUBLIC_KEY');

  // 3. Define the amount in lamports (1 SOL = 1,000,000,000 lamports)
  const amountInLamports = 100 * LAMPORTS_PER_SOL;

  try {
    // 4. Request the airdrop
    const signature = await connection.requestAirdrop(publicKey, amountInLamports);

    // 5. Confirm the transaction (optional but recommended to ensure it processed)
    await connection.confirmTransaction(signature);

    console.log(`Airdrop successful. Transaction signature: ${signature}`);
    // console.log(`View transaction on the explorer: explorer.solana.com{signature}?cluster=devnet`);
  } catch (error) {
    console.error('Airdrop failed:', error);
    // You may hit a rate limit. Try a web faucet or use a different RPC endpoint.
  }
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

const closeTokenAccount = async (connection: Connection, payer: Keypair, tokenAccount: PublicKey, destAccount: PublicKey) => {
  // Assume connection, feePayer, and the token account details are already set up
  // const connection = new Connection(/* ... */);
  const feePayer = payer; // The account paying for the transaction fees
  const tokenAccountPubkey = tokenAccount; // The account you want to close
  const destinationAccountPubkey = destAccount; // The account to receive the reclaimed SOL rent
  const authority = feePayer.publicKey; // The owner/authority of the token account

  try {
    const txhash = await closeAccount(
      connection, // Connection
      feePayer, // Payer of the transaction fees
      tokenAccountPubkey, // Account to close
      destinationAccountPubkey, // Account to receive the remaining SOL rent
      authority // Authority (owner) of the token account
      // Optional: multiSigners, confirmOptions, programId
    );
    console.log(`Account closed with transaction signature: ${txhash}`);
  } catch (error) {
    console.error('Failed to close account:', error);
  }
};

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

export { loadKeypair, generateKeypair, accountDetails, displayWalletTokens, requestAirdrop, getTransactionLamports };

// const keypair = loadKeypair();
// const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
// accountDetails(connection, keypair.publicKey);
// displayWalletTokens(connection, keypair.publicKey);
// closeTokenAccount(connection, keypair, new PublicKey('Ajj8z84sx8KSijuybEuZLBa9xxHnBZRRfex3rGKoinok'), keypair.publicKey);
