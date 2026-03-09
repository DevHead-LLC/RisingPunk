import mongoose, { Schema, Document } from 'mongoose';

/** Single packet in the run (engine state). */
export interface IRCHPacket {
  id: string;
  type: string;
  value: number;
  isHijacked: boolean;
}

export interface IRaceConditionHeistSession extends Document {
  userId: mongoose.Types.ObjectId;
  levelId: string;
  startedAt: Date;
  matchDurationMs: number;
  /** Words shown one at a time; last is secure word. Exploit when word before it is shown. */
  wordRotation: string[];
  /** Ms per word before rotating. */
  wordDurationMs: number;
  /** Random starting index in wordRotation so cycle doesn't always start at 0. */
  wordStartOffset?: number;
  /** Tier 2+: second word cycle for the second node (Encrypt). Starts when first node is captured. */
  wordRotationPhase2?: string[];
  wordStartOffsetPhase2?: number;
  /** Set when first packet is hijacked; used to compute phase-2 word index. */
  phase2StartedAt?: Date;
  /** Tier 3: third word cycle for the third node (Exfiltrate). Starts when second node is captured. */
  wordRotationPhase3?: string[];
  wordStartOffsetPhase3?: number;
  phase3StartedAt?: Date;
  /** Tier 4: fourth word cycle for the fourth node (Bypass). Starts when third node is captured. */
  wordRotationPhase4?: string[];
  wordStartOffsetPhase4?: number;
  phase4StartedAt?: Date;
  phase: 'RUNNING' | 'LOCKDOWN' | 'RESULTS';
  packets: IRCHPacket[];
  score: number;
  comboCount: number;
  lastSuccessfulHijackAt?: Date;
  exploitCooldownUntil?: Date;
}

const rchPacketSchema = new Schema(
  {
    id: String,
    type: String,
    value: Number,
    isHijacked: Boolean,
  },
  { _id: false }
);

const raceConditionHeistSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    levelId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    matchDurationMs: { type: Number, required: true },
    wordRotation: { type: [String], required: true },
    wordDurationMs: { type: Number, required: true },
    wordStartOffset: { type: Number, required: false },
    wordRotationPhase2: { type: [String], required: false },
    wordStartOffsetPhase2: { type: Number, required: false },
    phase2StartedAt: { type: Date, required: false },
    wordRotationPhase3: { type: [String], required: false },
    wordStartOffsetPhase3: { type: Number, required: false },
    phase3StartedAt: { type: Date, required: false },
    wordRotationPhase4: { type: [String], required: false },
    wordStartOffsetPhase4: { type: Number, required: false },
    phase4StartedAt: { type: Date, required: false },
    phase: { type: String, enum: ['RUNNING', 'LOCKDOWN', 'RESULTS'], default: 'RUNNING' },
    packets: { type: [rchPacketSchema], default: [] },
    score: { type: Number, default: 0 },
    comboCount: { type: Number, default: 0 },
    lastSuccessfulHijackAt: { type: Date, required: false },
    exploitCooldownUntil: { type: Date, required: false },
  },
  { collection: 'raceconditionheist_sessions', timestamps: true }
);

raceConditionHeistSessionSchema.index({ userId: 1, levelId: 1 }, { unique: true });

export const RaceConditionHeistSession = mongoose.model<IRaceConditionHeistSession>(
  'RaceConditionHeistSession',
  raceConditionHeistSessionSchema
);
