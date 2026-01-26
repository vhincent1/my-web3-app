import { Connection } from '@solana/web3.js';

const ENVIRONMENT = {
  developement: process.env.NODE_ENV === 'development',
  production: process.env.NODE_ENV === 'production',
  test: process.env.NODE_ENV === 'test'
};

const CONNECTION = new Connection('http://thinkpadx270:8899', 'confirmed');

export default {
  ENVIRONMENT,
  CONNECTION,
};
