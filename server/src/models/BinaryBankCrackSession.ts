import mongoose, { Schema, Document } from 'mongoose';

export interface IBinaryBankCrackSession extends Document {
  userId: mongoose.Types.ObjectId;
  levelId: string;
  /** Target decimal for each register (e.g. [7, 12, 3]). */
  vaultTargets: number[];
  /** Flips remaining. */
  flipsRemaining: number;
  /** Register index (0-based) the player is currently solving. */
  currentRegisterIndex: number;
  /** Whether cost was already deducted at session start. */
  firstAttemptPaid: boolean;
  /** Last register state we accepted on submit; used to compute server-authoritative flip count (not trusted from client). */
  lastAcceptedRegisters?: number[][];
}

const binaryBankCrackSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    levelId: { type: String, required: true },
    vaultTargets: { type: [Number], required: true },
    flipsRemaining: { type: Number, required: true },
    currentRegisterIndex: { type: Number, required: true, default: 0 },
    firstAttemptPaid: { type: Boolean, required: true, default: false },
    lastAcceptedRegisters: { type: [[Number]], required: false },
  },
  { collection: 'binarybankcrack_sessions', timestamps: true }
);

binaryBankCrackSessionSchema.index({ userId: 1, levelId: 1 }, { unique: true });

export const BinaryBankCrackSession = mongoose.model<IBinaryBankCrackSession>(
  'BinaryBankCrackSession',
  binaryBankCrackSessionSchema
);
