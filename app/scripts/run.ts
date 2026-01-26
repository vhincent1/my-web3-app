import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
import { accountDetails, displayWalletTokens, generateKeypair, loadKeypair, OWNER_KEYPAIR_PATH, requestAirdrop, TREASURY_KEYPAIR_PATH, USER_KEYPAIR_PATH } from './keypair.ts';
import { createSolanaToken, sendSPLTokens } from './createToken.ts';
import { publicKey } from '@coral-xyz/borsh';

const connection = new Connection('http://thinkpadx270:8899', 'confirmed');
const COMMANDS = {
  keygen: () => {
    const filename = process.argv[3];
    generateKeypair(filename);
  },
  airdrop: () => {
    const path = process.argv[3] || OWNER_KEYPAIR_PATH;
    const keypair = loadKeypair(path);

    requestAirdrop(connection, keypair.publicKey);
  },
  splSetup: async () => {
    const ownerKeypair = loadKeypair(OWNER_KEYPAIR_PATH);
    const treasuryKeypair = loadKeypair('./config/treasury-keypair.json');
    const userKeypair = loadKeypair('./config/user-keypair.json');

    [ownerKeypair, treasuryKeypair, userKeypair].forEach((kp) => requestAirdrop(connection, kp.publicKey));

    setTimeout(async () => {
      const splToken = await Promise.resolve(createSolanaToken(connection, ownerKeypair));

      [treasuryKeypair, userKeypair].forEach((kp) => sendSPLTokens(connection, ownerKeypair, splToken.mintAddress, 10, kp.publicKey));
    }, 2 * 1000 /* 2 seconds */);
  },
  'read-key': () => {
    const filename = process.argv[3] || USER_KEYPAIR_PATH;

    const keypair = loadKeypair(filename);

    accountDetails(connection, keypair.publicKey);
    displayWalletTokens(connection, keypair.publicKey);
  },
};

const run = async () => {
  const command = process.argv[2];
  const scriptMap = Object.entries(COMMANDS).map(([key, value]) => {
    return { name: key, exec: value };
  });
  const script = scriptMap.find((script) => script.name === command);
  if (script) {
    console.log(script);
    script.exec();
  } else {
    console.info(`command '${command}' not found, list of commands:`);
    const commandList = Object.keys(COMMANDS).map((name) => name);
    console.log(commandList.join(', '));
  }
};

run();
