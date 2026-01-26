import path from 'path'
import { Connection, Keypair } from '@solana/web3.js';
import { keypairUtils } from './src/utils.ts';

/**
 * Config
 */
// const __dirname = path.resolve()

const PORT = 3000

const adminKeypair = '/Users/vhincent/.config/solana/id.json'
const programKeypair = path.resolve(path.resolve(), 'config', 'program-keypair.json');
const rpcUrl = 'http://thinkpadx270:8899'

const CONNECTION = new Connection(rpcUrl, 'confirmed');
// const ADMIN_WALLET = { filePath: adminKeypair, keypair: keypairUtils.generate() }
const ADMIN_WALLET = keypairUtils.load(adminKeypair)
const PROGRAM_WALLET = keypairUtils.load(programKeypair)

export default {
    // solana program
    CONNECTION,
    ADMIN_WALLET,
    PROGRAM_WALLET,
    PROGRAM_ID: PROGRAM_WALLET.keypair.publicKey,
    // express client
    PORT
}