import { Connection } from '@solana/web3.js';
import process from "node:process";

process.env.TOKEN_SECRET = 'token-secret';

const CONNECTION = new Connection('http://thinkpadx270:8899', 'confirmed');

// keypairs
export const CLI_KEYPAIR_PATH = '/Users/vhincent/.config/solana/id.json';
export const OWNER_KEYPAIR_PATH = './config/owner-keypair.json';
export const MULE_KEYPAIR_PATH = './config/mule-keypair.json';
export const TREASURY_KEYPAIR_PATH = './config/treasury-keypair.json';
export const PROGRAM_KEYPAIR_PATH = './config/program-keypair.json';
export const USER_KEYPAIR_PATH = './config/user-keypair.json';

const ENVIRONMENT = {
  developement: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  test: process.env.NODE_ENV === 'test',
};

export default {
  ENVIRONMENT,
  CONNECTION,
};
