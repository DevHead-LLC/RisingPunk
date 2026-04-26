import mongoose, { Document, Schema } from 'mongoose';

export interface IUserBugHuntStateDocument extends Document {
  userId: string;
  currentTokens: number;
  maxTokens: number;
  regenPerMinute: number;
  lastRegenAt: Date;
  storageItems?: Array<{
    itemKey: string;
    quantity: number;
  }>;
  pendingTravelSpeedupPercent?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const userBugHuntStateSchema = new Schema<IUserBugHuntStateDocument>(
  {
    userId: { type: String, required: true },
    currentTokens: { type: Number, required: true, min: 0 },
    maxTokens: { type: Number, required: true, min: 1 },
    regenPerMinute: { type: Number, required: true, min: 0 },
    lastRegenAt: { type: Date, required: true },
    storageItems: {
      type: [
        new Schema(
          {
            itemKey: { type: String, required: true },
            quantity: { type: Number, required: true, min: 0 },
          },
          { _id: false }
        ),
      ],
      required: false,
    },
    pendingTravelSpeedupPercent: { type: Number, required: false, min: 0 },
  },
  { collection: 'user_bug_hunt_state', timestamps: true }
);

userBugHuntStateSchema.index({ userId: 1 }, { unique: true });

export const UserBugHuntState = mongoose.model<IUserBugHuntStateDocument>(
  'UserBugHuntState',
  userBugHuntStateSchema
);
