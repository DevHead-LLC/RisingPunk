import mongoose, { Document, Schema } from 'mongoose';

/**
 * Persisted battle replay (R2 write path; R3 adds GET + lifecycle hooks).
 * Frames match shared {@link BattleReplayDocument} / `battle_replays` collection.
 */
export interface IBattleReplayDocument extends Document {
  battleId: string;
  replayVersion: number;
  canonicalScreenWidth: number;
  canonicalScreenHeight: number;
  totalDurationMs: number;
  snapshotCount: number;
  snapshots: unknown[];
  createdAt: Date;
  attackerId: string;
  defenderId: string;
  isNpc: boolean;
  winner: 'user' | 'enemy';
}

const battleReplaySchema = new Schema<IBattleReplayDocument>(
  {
    battleId: { type: String, required: true, unique: true },
    replayVersion: { type: Number, required: true },
    canonicalScreenWidth: { type: Number, required: true },
    canonicalScreenHeight: { type: Number, required: true },
    totalDurationMs: { type: Number, required: true },
    snapshotCount: { type: Number, required: true },
    snapshots: { type: [Schema.Types.Mixed], required: true },
    createdAt: { type: Date, required: true },
    attackerId: { type: String, required: true },
    defenderId: { type: String, required: true },
    isNpc: { type: Boolean, required: true },
    winner: { type: String, enum: ['user', 'enemy'], required: true },
  },
  { collection: 'battle_replays' }
);

battleReplaySchema.index({ attackerId: 1 });
battleReplaySchema.index({ defenderId: 1 });
battleReplaySchema.index({ createdAt: -1 });

export const BattleReplay = mongoose.model<IBattleReplayDocument>('BattleReplay', battleReplaySchema);
