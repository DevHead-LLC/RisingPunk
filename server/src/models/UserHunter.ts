import mongoose, { Document, Schema } from 'mongoose';
import { HUNTER_ROSTER_KAITO_GLITCH, MAX_HUNTER_LEVEL, type HunterRosterId } from '../types/bugHunt';

export interface IUserHunterDocument extends Document {
  userId: string;
  hunterRosterId: HunterRosterId;
  unlockedAt: Date;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  totalExp: number;
  createdAt: Date;
  updatedAt: Date;
}

const userHunterSchema = new Schema<IUserHunterDocument>(
  {
    userId: { type: String, required: true },
    hunterRosterId: { type: String, required: true, enum: [HUNTER_ROSTER_KAITO_GLITCH] },
    unlockedAt: { type: Date, required: true },
    level: { type: Number, required: true, min: 1, max: MAX_HUNTER_LEVEL },
    currentExp: { type: Number, required: true, min: 0 },
    nextLevelExp: { type: Number, required: true, min: 0 },
    totalExp: { type: Number, required: true, min: 0 },
  },
  { collection: 'user_hunters', timestamps: true }
);

userHunterSchema.index({ userId: 1, hunterRosterId: 1 }, { unique: true });
userHunterSchema.index({ userId: 1 });

export const UserHunter = mongoose.model<IUserHunterDocument>('UserHunter', userHunterSchema);
