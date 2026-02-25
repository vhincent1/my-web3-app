import * as borsh from 'borsh';
import * as web3 from '@solana/web3.js';
import { Buffer } from 'buffer';

// Define the layout for the instruction
class MetadataInstruction {
  name: string;
  symbol: string;
  uri: string;
  constructor(fields: { name: string; symbol: string; uri: string }) {
    this.name = fields.name;
    this.symbol = fields.symbol;
    this.uri = fields.uri;
  }
}

const MetadataSchema = {
  struct: {
    name: 'string',
    symbol: 'string',
    uri: 'string',
  },
};

// Metaplex Metadata Program ID
const METADATA_PROGRAM_ID = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

async function runTest() {
  const connection = new web3.Connection('http://thinkpadx270:8879', 'confirmed');
  const payer = web3.Keypair.generate();
  
  const programId = new web3.PublicKey('YOUR_PROGRAM_ID');
  const mintAddress = new web3.PublicKey('YOUR_MINT_ADDRESS');

  // 1. Derive the Metadata PDA (Metaplex Standard)
  const [metadataPDA] = web3.PublicKey.findProgramAddressSync([Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mintAddress.toBuffer()], METADATA_PROGRAM_ID);
  // 2. Derive your program's Mint Authority PDA
  const [mintAuthPDA] = web3.PublicKey.findProgramAddressSync([Buffer.from('mint_authority')], programId);

  const name = 'My Native Token';
  const symbol = 'MNT';
  const uri = 'https://arweave.net/YOUR_JSON_LINK_HERE'; // The link from Step 1

  //   const uriTemplate = {
  //     name: 'My Native Token',
  //     symbol: 'MNT',
  //     description: 'This is a token created natively on Solana!',
  //     image: 'https://arweave.net/URl_TO_YOUR_IMAGE',
  //     attributes: [],
  //     properties: {
  //       files: [
  //         {
  //           uri: 'https://arweave.net/URl_TO_YOUR_IMAGE',
  //           type: 'image/png',
  //         },
  //       ],
  //     },
  //   };

  // 1. Serialize the data
  const ixData = new MetadataInstruction({ name, symbol, uri });
  const buffer = Buffer.from(borsh.serialize(MetadataSchema, ixData));

  // 2. Create the instruction
  const tx = new web3.Transaction().add(
    new web3.TransactionInstruction({
      programId: programId,
      data: buffer, // Passing the serialized strings here
      keys: [
        { pubkey: metadataPDA, isSigner: false, isWritable: true },
        { pubkey: mintAddress, isSigner: false, isWritable: false },
        { pubkey: mintAuthPDA, isSigner: false, isWritable: false },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: web3.SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
    }),
  );

  await web3.sendAndConfirmTransaction(connection, tx, [payer]);
}
