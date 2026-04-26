import mongoose, { Document, Schema } from 'mongoose';
import { BUG_LIFECYCLE_STATES, BUG_TYPE_ANT, type BugLifecycleState, type BugType } from '../types/bugHunt';

export interface IBugInstanceDocument extends Document {
  bugInstanceId: string;
  bugType: BugType;
  mapCellX: number;
  mapCellY: number;
  maxHp: number;
  currentHp: number;
  hpPercent: number;
  seq: number;
  lifecycleState: BugLifecycleState;
  spawnedAt: Date;
  defeatedAt?: Date;
  removedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bugInstanceSchema = new Schema<IBugInstanceDocument>(
  {
    bugInstanceId: { type: String, required: true, unique: true },
    bugType: { type: String, required: true, enum: [BUG_TYPE_ANT] },
    mapCellX: { type: Number, required: true },
    mapCellY: { type: Number, required: true },
    maxHp: { type: Number, required: true },
    currentHp: { type: Number, required: true },
    hpPercent: { type: Number, required: true },
    seq: { type: Number, required: true },
    lifecycleState: { type: String, required: true, enum: [...BUG_LIFECYCLE_STATES] },
    spawnedAt: { type: Date, required: true },
    defeatedAt: { type: Date, required: false },
    removedAt: { type: Date, required: false },
  },
  { collection: 'bug_instances', timestamps: true }
);

bugInstanceSchema.index({ bugType: 1, lifecycleState: 1 });
bugInstanceSchema.index({ mapCellX: 1, mapCellY: 1, lifecycleState: 1 });
bugInstanceSchema.index({ bugType: 1, spawnedAt: -1 });

bugInstanceSchema.pre('validate', function preValidate(next) {
  if (!Number.isFinite(this.maxHp) || this.maxHp <= 0) {
    next(new Error('maxHp must be a positive finite number'));
    return;
  }
  if (!Number.isFinite(this.currentHp) || this.currentHp < 0 || this.currentHp > this.maxHp) {
    next(new Error('currentHp must be finite and within [0, maxHp]'));
    return;
  }
  if (!Number.isFinite(this.hpPercent) || this.hpPercent < 0 || this.hpPercent > 100) {
    next(new Error('hpPercent must be finite and within [0, 100]'));
    return;
  }
  if (!Number.isInteger(this.seq) || this.seq < 0) {
    next(new Error('seq must be a non-negative integer'));
    return;
  }
  next();
});

export const BugInstance = mongoose.model<IBugInstanceDocument>('BugInstance', bugInstanceSchema);
