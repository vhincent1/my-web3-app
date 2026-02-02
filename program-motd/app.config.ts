import { resolve } from "jsr:@std/path";
import { Connection, Keypair } from '@solana/web3.js';
import { keypairUtils } from '@my-util-lib/utils';

/**
 * Config
 */
// const __dirname = path.resolve()

const PORT = 3000

const adminKeypair = '/Users/vhincent/.config/solana/id.json'
const programKeypair = resolve(import.meta.dirname, 'config', 'program-keypair.json');
const rpcUrl = 'http://thinkpadx270:8899'

const CONNECTION = new Connection(rpcUrl, 'confirmed');
// const ADMIN_WALLET = { filePath: adminKeypair, keypair: keypairUtils.generate() }
const ADMIN_WALLET = keypairUtils.loadKeypair(adminKeypair)
const PROGRAM_WALLET = keypairUtils.loadKeypair(programKeypair)

export default {
    // solana program
    CONNECTION,
    ADMIN_WALLET,
    PROGRAM_WALLET,
    PROGRAM_ID: PROGRAM_WALLET.keypair.publicKey,
    // express client
    PORT
}