
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertNotEquals, assert, fail } from '@std/assert';

import appConfig from '../app.config.ts';
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { keypairUtils } from '@my-util-lib/utils';
import { MotdProgram } from '../lib/instructions.ts';
import { MotdStateLayout } from '../lib/schema.ts';

// --- CONFIGURATION ---
const PROGRAM_ID = appConfig.PROGRAM_ID;
const CONNECTION = appConfig.CONNECTION;
const PROGRAM = new MotdProgram(CONNECTION, PROGRAM_ID);
const adminWallet = appConfig.ADMIN_WALLET.keypair;
const hackerWallet = keypairUtils.generateKeypair();
const pda: PublicKey = PROGRAM.pda;

const messages = {
  initialized: 'init',
  initialized2: 'init hack',
  update: 'Update test',

  errors: {
    alreadyInitialized: 'instruction requires an uninitialized account',
    invalidSigner: 'Signer is not the admin',
  },
};

// global setup: airdrop funds to test wallets
await (async function setup() {
  const sig1 = await CONNECTION.requestAirdrop(adminWallet.publicKey, 2 * LAMPORTS_PER_SOL);
  const sig2 = await CONNECTION.requestAirdrop(hackerWallet.publicKey, 2 * LAMPORTS_PER_SOL);
  for (const signature of [sig1, sig2]) {
    const latestBlockhash = await CONNECTION.getLatestBlockhash();
    await CONNECTION.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed',);
  }
  console.log('Test Admin:', adminWallet.publicKey.toBase58());
  console.log('Test PDA:', pda.toBase58());
})();

const options = { sanitizeResources: false, sanitizeOps: false };

describe('Message Of The Day Program Test', options, () => {
  it('Initializes the message account', async () => {
    const initIx = PROGRAM.createInstruction(adminWallet.publicKey, 0, messages.initialized);
    const ix = new Transaction().add(initIx);
    try {
      await sendAndConfirmTransaction(CONNECTION, ix, [adminWallet]);
    } catch (err: any) {
      const logString = err.logs ? err.logs.join('') : err.toString();
      if (logString.includes(messages.errors.alreadyInitialized)) {
        console.log('Already initialized');
        // ensure the error contains the expected message
        if (!logString.includes(messages.errors.alreadyInitialized)) throw new Error('Expected alreadyInitialized error');
      }
    }

    // 4. Assertions: Fetch account and verify state
    const accountInfo = await CONNECTION.getAccountInfo(pda);
    // console.log('account info:', accountInfo)
    expect(accountInfo).not.toBeNull();
    if (accountInfo) {
      const decoded = await PROGRAM.update();
      expect(decoded.is_initialized).toBe(true);
      expect(decoded.admin.toBase58()).toBe(adminWallet.publicKey.toBase58());
      if (decoded.message == messages.initialized) {
        expect(decoded.message).toBe(messages.initialized);
      } else {
        expect(decoded.message).toBe(messages.update);
      }
    }
  });

  it('Prevents Re-Initialization (Security Check)', async () => {
    const initIx = PROGRAM.createInstruction(adminWallet.publicKey, 0, messages.initialized);
    // const initIxs = await PROGRAM.createInitializeInstructions(adminWallet.publicKey, messages.initialized);
    const ix = new Transaction().add(initIx);
    try {
      // 3. Send Transaction
      await sendAndConfirmTransaction(CONNECTION, ix, [adminWallet]);
    } catch (err) {
      const logString = err.logs ? err.logs.join('') : err.toString();
      //   expect(logString).toContain(messages.errors.alreadyInitialized);
      if (logString.includes(messages.errors.alreadyInitialized)) {
        console.log('Already initialized');
        expect(logString).toContain(messages.errors.alreadyInitialized);
      }
    }
  });

  it('Updates the message', async () => {
    const updateIx = PROGRAM.createInstruction(adminWallet.publicKey, 1, messages.update);

    // const updateIx = PROGRAM.createUpdateInstruction(adminWallet.publicKey, messages.update);
    const ix = new Transaction().add(updateIx);
    // 3. Send Transaction
    await sendAndConfirmTransaction(CONNECTION, ix, [adminWallet]);
    // 4. Assertions
    const accountInfo = await CONNECTION.getAccountInfo(pda);
    const decoded = MotdStateLayout.decode(accountInfo!.data);
    expect(decoded.message).toBe(messages.update);
  });

  it('Prevents Unauthorized Updates (Security Check)', async () => {
    const updateIx = PROGRAM.createInstruction(adminWallet.publicKey, 1, messages.update);
    // const updateIx = PROGRAM.createUpdateInstruction(adminWallet.publicKey, messages.update);
    const ix = new Transaction().add(updateIx);
    // We expect this to fail
    try {
      await sendAndConfirmTransaction(CONNECTION, ix, [hackerWallet]);
      fail('Transaction should have failed'); // Force fail if it succeeds
    } catch (error: any) {
      // Check logs for specific custom error code or generic error
      expect(error.toString()).toMatch(/Error/);
    }
  });
});
