import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const loadKeypair = (filePath: string, print: boolean = false) => {
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

const generateKeypair = () => {
  const keypair = Keypair.generate();
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


export  { keypairUtils };
