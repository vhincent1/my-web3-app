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
    secretKey: keypair.secretKey,
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
   
    const isDupe = jsonArray.some(data => data.publicKey === append.publicKey)
    if(isDupe) {
      console.log('Dupe entry')
      return
    }
    jsonArray.push(append);
    const updatedJsonString = JSON.stringify(jsonArray, null, 2);
    fs.writeFileSync(filePath, updatedJsonString, 'utf8');

    console.log('Logged keypair:',append.publicKey)
  } catch (error) {
    // Handle errors (e.g., file not found, invalid JSON, permission issues)
    console.error('Error handling JSON file:', error.message);
  }
};

export const keypairUtils = {
  generate: generateKeypair,
  load: loadKeypair,
  log: logKeypair,
};

// const options: any = {
//   port: { alias: 'p', type: 'number', desc: 'client port', default: null },
// };

export const parseArgs = (args, options) => {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      // Handle Double Dash (--flag)
      const key = arg.substring(2);
      const nextValue = args[i + 1];
      if (nextValue && !nextValue.startsWith('-')) {
        flags[key] = nextValue;
        i++;
      } else flags[key] = true;
    } else if (arg.startsWith('-')) {
      // Handle Single Dash (-f or -abc)
      const chars = arg.substring(1);
      // If it's a single char, it can take a value: -p 8080
      if (chars.length === 1) {
        const nextValue = args[i + 1];
        if (nextValue && !nextValue.startsWith('-')) {
          flags[chars] = nextValue;
          i++;
        } else flags[chars] = true;
      }
      // If it's multiple chars, treat as a cluster: -abc => a:true, b:true, c:true
      else for (const char of chars) flags[char] = true;
    } else positionals.push(arg);
  }
  if (options) {
    // 1. Get the list of allowed keys
    const allowedKeys = Object.keys(options);
    const unrecognized = Object.keys(flags).filter((key) => !allowedKeys.includes(key) && key !== 'help' && key !== 'h');
    if (unrecognized.length > 0) {
      console.error(`Error: Unrecognized flags: ${unrecognized.map((k) => `-${k.length > 1 ? '-' : ''}${k}`).join(', ')}`);
      process.exit(0);
    }
  }
  return { flags, positionals };
};
