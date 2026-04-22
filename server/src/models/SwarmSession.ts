import mongoose, { Document, Schema } from 'mongoose';

export type SwarmSessionState =
  | 'preparing'
  | 'marching'
  | 'resolved'
  | 'cancelled';

export interface ISwarmCommitment {
  slotIndex: number;
  userId: string;
  userHandle?: string;
  botType: 'guardian' | 'breacher' | 'phreak';
  markLevel: 1 | 2;
  quantity: number;
  committedAt: Date;
}

export interface ISwarmRewardShare {
  userId: string;
  cashShare: number;
  xpShare: number;
}

export interface ISwarmSessionDocument extends Document {
  swarmId: string;
  leaderUserId: string;
  crewId: string;
  targetUserId: string;
  targetX: number;
  targetY: number;
  state: SwarmSessionState;
  cancelReason?: string;
  deadlineAt: Date;
  deployedAt?: Date;
  resolvedAt?: Date;
  marchId?: string;
  battleId?: string;
  commitments: ISwarmCommitment[];
  participants: string[];
  rewardShares?: ISwarmRewardShare[];
  createdAt: Date;
  updatedAt: Date;
}

const swarmCommitmentSchema = new Schema<ISwarmCommitment>(
  {
    slotIndex: { type: Number, required: true, min: 1, max: 18 },
    userId: { type: String, required: true },
    userHandle: { type: String, required: false },
    botType: { type: String, required: true, enum: ['guardian', 'breacher', 'phreak'] },
    markLevel: { type: Number, required: true, enum: [1, 2] },
    quantity: { type: Number, required: true, min: 1, max: 5000 },
    committedAt: { type: Date, required: true },
  },
  { _id: false }
);

const swarmRewardShareSchema = new Schema<ISwarmRewardShare>(
  {
    userId: { type: String, required: true },
    cashShare: { type: Number, required: true, min: 0 },
    xpShare: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const swarmSessionSchema = new Schema<ISwarmSessionDocument>(
  {
    swarmId: { type: String, required: true, unique: true },
    leaderUserId: { type: String, required: true },
    crewId: { type: String, required: true },
    targetUserId: { type: String, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    state: {
      type: String,
      required: true,
      enum: ['preparing', 'marching', 'resolved', 'cancelled'],
      default: 'preparing',
    },
    cancelReason: { type: String, required: false },
    deadlineAt: { type: Date, required: true },
    deployedAt: { type: Date, required: false },
    resolvedAt: { type: Date, required: false },
    marchId: { type: String, required: false },
    battleId: { type: String, required: false },
    commitments: { type: [swarmCommitmentSchema], required: true, default: [] },
    participants: { type: [String], required: true, default: [] },
    rewardShares: { type: [swarmRewardShareSchema], required: false },
  },
  {
    collection: 'swarm_sessions',
    timestamps: true,
  }
);

swarmSessionSchema.index({ leaderUserId: 1, state: 1 });
swarmSessionSchema.index({ crewId: 1, state: 1 });
swarmSessionSchema.index({ deadlineAt: 1, state: 1 });
swarmSessionSchema.index(
  { leaderUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { state: { $in: ['preparing', 'marching'] } },
  }
);

export const SwarmSession = mongoose.model<ISwarmSessionDocument>('SwarmSession', swarmSessionSchema);
