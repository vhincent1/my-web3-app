import * as borsh from "@coral-xyz/borsh";
import { PublicKey } from "@solana/web3.js";

// Matches Rust: struct MotdState { is_initialized: bool, admin: Pubkey, message: String }
export const MotdStateLayout = borsh.struct([
  borsh.bool("is_initialized"),
  borsh.publicKey("admin"),
  borsh.str("message"),
]);

// Matches Rust: enum MotdInstruction { Initialize, Update }
export const InstructionLayout = borsh.struct([
  borsh.u8("variant"), // 0 = Initialize, 1 = Update
  borsh.str("message"),
]);

export interface MotdState {
  is_initialized: boolean;
  admin: PublicKey;
  message: string;

  stage?: number
}