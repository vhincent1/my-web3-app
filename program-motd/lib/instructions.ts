import { PublicKey, SystemProgram, TransactionInstruction, Keypair, Connection, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { InstructionLayout, MotdState, MotdStateLayout } from './schema.ts';

export class MotdProgram {
  connection: Connection;

  programId: PublicKey;
  seed: string;
  pda: PublicKey;

  state: MotdState; //ejs

  constructor(connection: Connection, programId: PublicKey) {
    this.programId = programId;
    this.seed = 'motd';
    //message account
    const [pda] = PublicKey.findProgramAddressSync([Buffer.from(this.seed)], this.programId);
    this.pda = pda;
    this.connection = connection;
  }

  async initialize() {
    console.log('init')
    const state = await this.update();
    this.state = state;
  }

  errorCodes = () => {};

  async update(): Promise<MotdState> {
    console.log('Update account...');
    try {
      if (!(await this.connection.getAccountInfo(this.programId))) {
        return { is_initialized: false, admin: PublicKey.default, message: 'Program not found', stage: 0 };
      }
      const info = await this.connection.getAccountInfo(this.pda);
      if (!info) {
        console.log('Account not found (not yet initialized on-chain)');
        return {
          is_initialized: false,
          admin: PublicKey.default,
          message: 'Account not found (not yet initialized on-chain)',
          stage: 1,
        };
      }

      const state = MotdStateLayout.decode(info.data);
      state.stage = 2;
      console.log('MOTD:', state);
      this.state = state;
      return state;
    } catch (error) {
      return { is_initialized: false, admin: PublicKey.default, message: 'RPC endpoint error', stage: -1 };
    }
  }

  validateMessage = (variant: number, message: string, throwError = false) => {
    const msg = message.trim();
    let result = { valid: true, error: null };
    if (variant > 1) result = { valid: false, error: 'Invalid variant: 0 = Initialize, 1 = Update' };
    if (msg.length === 0) result = { valid: false, error: 'Message cannot be empty.' };
    if (msg.length > 512) result = { valid: false, error: 'Message is too long (max 512).' };
    if (throwError && !result.valid) throw new Error('validateMessage: '+result.error);
    return result;
  };

  constructData = (variant: number, message: string) => {
    const buffer = Buffer.alloc(1000);
    const len = InstructionLayout.encode({ variant, message }, buffer);
    return buffer.subarray(0, len);
  };

  createInstruction(payer: PublicKey, type: 0 | 1, message: string): TransactionInstruction {
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: false },
      { pubkey: this.pda, isSigner: false, isWritable: true },
    ];

    // If initializing (type 0), add the SystemProgram to the keys
    if (type === 0) keys.push({ pubkey: SystemProgram.programId, isSigner: false, isWritable: false });

    return new TransactionInstruction({
      programId: this.programId,
      keys,
      data: this.constructData(type, message),
    });
  }

  // createInitializeInstructions(payer: PublicKey, message: string): TransactionInstruction[] {
  //   const instructions = [];
  //   const initIx = new TransactionInstruction({
  //     programId: this.programId,
  //     keys: [
  //       { pubkey: payer, isSigner: true, isWritable: false },
  //       { pubkey: this.pda, isSigner: false, isWritable: true },
  //       { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  //     ],
  //     data: this.constructData(0, message),
  //   });
  //   instructions.push(initIx);
  //   return instructions;
  // }

  // createUpdateInstruction(payer: PublicKey, newMessage: string): TransactionInstruction {
  //   return new TransactionInstruction({
  //     programId: this.programId,
  //     keys: [
  //       { pubkey: payer, isSigner: true, isWritable: false },
  //       { pubkey: this.pda, isSigner: false, isWritable: true },
  //     ],
  //     data: this.constructData(1, newMessage),
  //   });
  // }

  async submitMessage(payer: Keypair, type: 0 | 1, message: string) {
    try {
      const checkMessage = this.validateMessage(type, message, true);
      if (!checkMessage.valid) return { status: checkMessage.error };
      
      console.log('Update check')
      const state = await this.update();
      if (!state.is_initialized) return { status: state.message };

      const ix = this.createInstruction(payer.publicKey, type, message);
      const tx = new Transaction().add(ix);

      console.log('send')
      const signature = await sendAndConfirmTransaction(this.connection, tx, [payer]);
      console.log('signature: ',signature)
      return { status: `Success: tx signature: ${signature}` };
    } catch (err) {
      console.log('submitMessage: ',err)
      // if (err instanceof Error) return { status: err.message };
      // return { status: err.transactionMessage };
      // return { status: err.message ?? err.transactionMessage };
      return { status: `Error: ${err.message ?? err.transactionMessage}` };
    }
  }
}
