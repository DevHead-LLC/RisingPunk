import mongoose, { Schema, Document } from 'mongoose';

/** Node as stored in session (display + validation). */
export interface INodeDef {
  id: string;
  protocol: string;
  port: number;
}

export interface IPacketBreachSession extends Document {
  userId: mongoose.Types.ObjectId;
  levelId: string;
  solution: string[];
  antiSolution: string[];
  attemptsLeft: number;
  nodePool: INodeDef[];
  slots: number;
  firstAttemptPaid: boolean;
  decoyNodeId?: string;
}

const nodeDefSchema = new Schema(
  { id: String, protocol: String, port: Number },
  { _id: false }
);

const packetBreachSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    levelId: { type: String, required: true },
    solution: { type: [String], required: true },
    antiSolution: { type: [String], required: true },
    attemptsLeft: { type: Number, required: true },
    nodePool: { type: [nodeDefSchema], required: true },
    slots: { type: Number, required: true },
    firstAttemptPaid: { type: Boolean, required: true },
    decoyNodeId: { type: String, required: false },
  },
  { collection: 'packetbreach_sessions', timestamps: true }
);

packetBreachSessionSchema.index({ userId: 1, levelId: 1 }, { unique: true });

export const PacketBreachSession = mongoose.model<IPacketBreachSession>(
  'PacketBreachSession',
  packetBreachSessionSchema
);
