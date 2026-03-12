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
  /** Tier 6–7: fifth word cycle for the fifth node (Extract). Starts when fourth node is captured. */
  wordRotationPhase5?: string[];
  wordStartOffsetPhase5?: number;
  phase5StartedAt?: Date;
  /** Tier 7–9: sixth word cycle for the sixth node (Offload). Starts when fifth node is captured. */
  wordRotationPhase6?: string[];
  wordStartOffsetPhase6?: number;
  phase6StartedAt?: Date;
  /** Tier 8–9: seventh word cycle for the seventh node (Purge). Starts when sixth node is captured. */
  wordRotationPhase7?: string[];
  wordStartOffsetPhase7?: number;
  phase7StartedAt?: Date;
  /** Tier 9: eighth word cycle for the eighth node (Wipe). Starts when seventh node is captured. */
  wordRotationPhase8?: string[];
  wordStartOffsetPhase8?: number;
  phase8StartedAt?: Date;
  /** Tiers 12+: ninth word cycle for the ninth node (Scrub). Starts when eighth node is captured. */
  wordRotationPhase9?: string[];
  wordStartOffsetPhase9?: number;
  phase9StartedAt?: Date;
  /** Tiers 14+: tenth word cycle for the tenth node (Flush). Starts when ninth node is captured. */
  wordRotationPhase10?: string[];
  wordStartOffsetPhase10?: number;
  phase10StartedAt?: Date;
  /** Tiers 16+: eleventh word cycle for the eleventh node. Starts when tenth node is captured. */
  wordRotationPhase11?: string[];
  wordStartOffsetPhase11?: number;
  phase11StartedAt?: Date;
  /** Tiers 18+: twelfth word cycle for the twelfth node. Starts when eleventh node is captured. */
  wordRotationPhase12?: string[];
  wordStartOffsetPhase12?: number;
  phase12StartedAt?: Date;
  /** Tiers 20+: thirteenth word cycle for the thirteenth node. Starts when twelfth node is captured. */
  wordRotationPhase13?: string[];
  wordStartOffsetPhase13?: number;
  phase13StartedAt?: Date;
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
    wordRotationPhase5: { type: [String], required: false },
    wordStartOffsetPhase5: { type: Number, required: false },
    phase5StartedAt: { type: Date, required: false },
    wordRotationPhase6: { type: [String], required: false },
    wordStartOffsetPhase6: { type: Number, required: false },
    phase6StartedAt: { type: Date, required: false },
    wordRotationPhase7: { type: [String], required: false },
    wordStartOffsetPhase7: { type: Number, required: false },
    phase7StartedAt: { type: Date, required: false },
    wordRotationPhase8: { type: [String], required: false },
    wordStartOffsetPhase8: { type: Number, required: false },
    phase8StartedAt: { type: Date, required: false },
    wordRotationPhase9: { type: [String], required: false },
    wordStartOffsetPhase9: { type: Number, required: false },
    phase9StartedAt: { type: Date, required: false },
    wordRotationPhase10: { type: [String], required: false },
    wordStartOffsetPhase10: { type: Number, required: false },
    phase10StartedAt: { type: Date, required: false },
    wordRotationPhase11: { type: [String], required: false },
    wordStartOffsetPhase11: { type: Number, required: false },
    phase11StartedAt: { type: Date, required: false },
    wordRotationPhase12: { type: [String], required: false },
    wordStartOffsetPhase12: { type: Number, required: false },
    phase12StartedAt: { type: Date, required: false },
    wordRotationPhase13: { type: [String], required: false },
    wordStartOffsetPhase13: { type: Number, required: false },
    phase13StartedAt: { type: Date, required: false },
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
