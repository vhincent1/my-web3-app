import { OWNER_KEYPAIR_PATH, USER_KEYPAIR_PATH } from '../app.config.ts';
import { Connection } from '@solana/web3.js';
import { createSolanaToken, sendSPLTokens } from './createToken.ts';
import { keypairUtils, solanaUtils, parseArgs } from '@my-util-lib/utils';
import process from "node:process";

const connection = new Connection('http://thinkpadx270:8899', 'confirmed');
const getArg = (index: number, fallback?: string) => process.argv[index] || fallback;

const commands: any = {
  keygen: () => {
    const filename = getArg(3);
    keypairUtils.generateKeypair(filename);
  },
  airdrop: async () => {
    const keypair = keypairUtils.loadKeypair(getArg(3, OWNER_KEYPAIR_PATH));
    solanaUtils.requestAirdrop(connection, keypair.keypair.publicKey, 1);
  },
  'read-key': async () => {
    const keypair = keypairUtils.loadKeypair(getArg(3, USER_KEYPAIR_PATH));
    solanaUtils.accountDetails(connection, keypair.keypair.publicKey);
    solanaUtils.displayWalletTokens(connection, keypair.keypair.publicKey);
  },
  'spl-setup': async () => {
    const [owner, treasury, user]: any = [OWNER_KEYPAIR_PATH, './config/treasury-keypair.json', './config/user-keypair.json'].map((f) => keypairUtils.loadKeypair(f));

    [owner, treasury, user].forEach((kp: any) => solanaUtils.requestAirdrop(connection, kp.keypair.publicKey, 1));

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const splToken = await createSolanaToken(connection, owner.keypair);
    [treasury, user].forEach((kp) => sendSPLTokens(connection, owner.keypair, splToken.mintAddress, 10, kp.publicKey));
  },
};

const run = async () => {
  const options: any = {
    port: { alias: 'p', type: 'number', desc: 'client port', value: 3000 },
    ...Object.fromEntries(Object.entries(commands).map(([k]) => [k, { type: 'void', desc: `run ${k}` }])),
  };

  const { flags, positionals }: any = parseArgs(process.argv.slice(2), options);
  const command = Object.keys(commands).find((cmd) => flags[cmd]);

  if (command) {
    await commands[command]?.();
  } else if (flags.port || flags.p) {
    console.log('port:', parseInt(flags.port || flags.p));
  } else {
    console.log('Available commands:', Object.keys(commands).join(', '));
  }
};

await run();
