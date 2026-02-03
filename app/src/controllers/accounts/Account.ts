import type appConfig from '../../../app.config.ts';
import * as bip39 from 'bip39';
import { HDKey } from 'micro-ed25519-hdkey';
import { type Connection, Keypair, type PublicKey, type LAMPORTS_PER_SOL } from '@solana/web3.js';

// interface AccountI {
//   id: number;
//   identifier: string;
//   password: string;

//   //inbox
//   messages: string[];

//   wallet: {
//     freeze: boolean;
//     mnemonic: string;
//     generated: number;
//     addresses: Array<{ keypair: Keypair; balance: number }>;
//   };
// }

export interface Message {
  sender: number;
  title: string;
  content: string;

  inbox?: number; // 0 inbox, 1 sent, 2 archive, 3 trash
  read?: boolean;
  timestamp?: Date;
}

export default class Account {
  id: number;
  identifier: string;
  password: string;
  role: number = 1;

  //inbox
  messages: Message[] = [];

  #wallet: {
    freeze: boolean;
    mnemonic: string;
    generated: number;
    addresses: Array<{ keypair: Keypair; balance: number }>;
  };

  constructor(id: number, identifier: string, password: string) {
    this.id = id;
    this.identifier = identifier;
    this.password = password;

    this.#wallet = {
      freeze: false,
      mnemonic: bip39.generateMnemonic(),
      generated: 1,
      addresses: [],
    };
  }

  getWallet = () => this.#wallet;

  getKeypair = (index = 0) => {
    const path = `m/44'/501'/${index}'/0'`;
    // 1. Generate a master seed from the mnemonic phrase
    const seed = bip39.mnemonicToSeedSync(this.#wallet.mnemonic, '');
    // 2. Derive the HD key from the master seed
    const hdKey = HDKey.fromMasterSeed(seed.toString('hex'));
    // 3. Derive a keypair using the specified derivation path
    const derivedKey = hdKey.derive(path);
    // 4. Create a Solana Keypair from the derived private key
    // Solana uses Ed25519 keypairs, and the derived private key is 32 bytes.
    const keypair = Keypair.fromSeed(derivedKey.privateKey);
    return keypair;
  };

  getKeypairs = () => Array.from({ length: this.#wallet.generated }, (_, i) => this.getKeypair(i));

  findKeypair = (targetAddress: string, maxSearch = 100) => {
    for (let i = 0; i < maxSearch; i++) {
      const keypair = this.getKeypair(i);
      if (keypair.publicKey.toBase58() === targetAddress) {
        console.log(`Found! Address ${targetAddress} is at index: ${i}`);
        return { index: i, keypair };
      }
    }
    throw new Error('Address not found within the search limit.');
  };

  getTotalBalance = () => this.#wallet.addresses.reduce((sum, acc) => sum + acc.balance, 0);
}

// const acc = { id: 1, identifier: '', keypairs: [Keypair.generate()] };
// const acc = new Account(2, '222');
// acc.keypairs = [Keypair.generate()];
// accountRepository.register(acc);
// accountRepository.update(acc, { hi: 'eee' });
// // console.log(accountRepository.getAccounts().length);
// // console.log(accountRepository.getAccounts().find((acc) => acc.id == 1));
// const find: Account | null = accountRepository.getAccounts().find((acc) => acc.id == 2) ?? null;
// console.log(find);

// const all = accountRepository.getAccounts().flatMap((acc) => acc.keypairs.map((kp) => kp.secretKey));
// console.log(all);

// function test() {
//   for (let i = 0; i < 15; i++) {
//     const testAcc: Account = {
//       id: i,
//       identifier: 'Account' + i,
//       keypairs: null,
//     };
//     accountRepository.push(testAcc);
//   }

//   console.log('Size: ', accountRepository.length);
//   console.log('free ID:', getFreeId());
// }

const getAccountInfo = (connection: Connection, publicKey: PublicKey) => {};

const generateDepositAddress = (connection: Connection) => {};
