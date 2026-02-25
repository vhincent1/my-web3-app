import { Connection, type Keypair, type clusterApiUrl, type LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getMint, createMint, getOrCreateAssociatedTokenAccount, mintTo, type TOKEN_PROGRAM_ID, transfer } from '@solana/spl-token';

const connection = new Connection('http://thinkpadx270:8899', 'confirmed');

export async function createSolanaToken(connection: Connection, minter: Keypair, supply: number = 1000) {
  // 1. Establish connection to the Solana Devnet
  // const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // 2. Load your wallet (Payer and Mint authority)
  // In a real application, load this securely (e.g., from a .env file or local file system)
  // For this example, we generate a new keypair (only for devnet testing)
  // const payer = loadKeypair();

  // 3. Define token parameters
  const decimals = 9; // Standard for most tokens

  // 4. Create the new token mint
  const mint = await createMint(
    connection, // Connection
    minter, // Payer of the transaction fees
    minter.publicKey, // Mint authority
    null, // Freeze authority (null means no freeze authority)
    decimals, // Number of decimals
    // { commitment: 'confirmed' },
    // TOKEN_PROGRAM_ID
  );

  console.log('--------------------------');
  console.log(`Token Mint Address: ${mint.toBase58()}`);

  // 5. Create an Associated Token Account (ATA) for the payer
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection, // Connection
    minter, // Payer of the transaction fees
    mint, // Mint address of the token
    minter.publicKey, // Owner of the ATA
  );

  console.log(`Associated Token Account Address: ${tokenAccount.address.toBase58()}`);

  // 6. Mint initial supply of tokens to the ATA
  const initialSupply = supply * Math.pow(10, decimals); // Example: 1000 tokens
  await mintTo(
    connection, // Connection
    minter, // Payer of the transaction fees
    mint, // Mint address
    tokenAccount.address, // Destination token account
    minter.publicKey, // Mint authority
    initialSupply, // Amount to mint
  );

  console.log(`Minted ${initialSupply / Math.pow(10, decimals)} tokens to the owner account.`);

  console.log('--------------------------');
  return { mintAddress: new PublicKey(mint.toBase58()) };
}

// createSolanaToken();

export async function sendSPLTokens(connection: Connection, senderWallet: Keypair, tokenMintAddress: PublicKey, amountToTransfer: number, receiverPubkey: PublicKey) {
  // Get the token's decimal value
  const mintInfo = await getMint(connection, tokenMintAddress);
  const decimals = mintInfo.decimals;
  const transferAmount = amountToTransfer * Math.pow(10, decimals); // Convert human amount to blockchain integer amount

  // Get or create the sender's associated token account (ATA)
  const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    senderWallet, // Payer of the ATA creation fee if needed
    tokenMintAddress,
    senderWallet.publicKey,
  );

  // Get or create the recipient's associated token account (ATA)
  // The sender's wallet pays for the creation of the recipient's ATA if it doesn't exist.
  const receiverTokenAccount = await getOrCreateAssociatedTokenAccount(connection, senderWallet, tokenMintAddress, receiverPubkey);

  // Alternative simple transfer function (handles ATA logic internally)
  const signature = await transfer(
    connection,
    senderWallet, // Payer
    senderTokenAccount.address, // Source ATA
    receiverTokenAccount.address, // Destination ATA
    senderWallet.publicKey, // Owner of source account
    transferAmount, // Amount
  );

  console.log(`Sent ${amountToTransfer} to ${receiverPubkey}`);
  console.log('Token Transfer Transaction Signature:', signature);
  // console.log(`View on Explorer: explorer.solana.com/tx/${signature}?cluster=devnet`);
}
