import mongoose, { Document, Schema } from 'mongoose';

export type TransferRunState = 'outbound' | 'resolving' | 'delivered' | 'failed' | 'cancelled';

export interface TransferRunItemPayloadRow {
  itemKey: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
}

export interface ITransferRunDocument extends Document {
  transferRunId: string;
  senderId: string;
  recipientId: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  recipientTargetX: number;
  recipientTargetY: number;
  distanceDu: number;
  secondsPerDu: number;
  totalTravelSeconds: number;
  walletAmount: number;
  itemValueTotal: number;
  totalTransferValue: number;
  feeAmount: number;
  itemPayload: TransferRunItemPayloadRow[];
  state: TransferRunState;
  departAt: Date;
  arriveAt: Date;
  resolvedAt?: Date;
  failureReason?: string;
  cancelledByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transferRunItemPayloadSchema = new Schema<TransferRunItemPayloadRow>(
  {
    itemKey: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitValue: { type: Number, required: true, min: 1 },
    totalValue: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const transferRunSchema = new Schema<ITransferRunDocument>(
  {
    transferRunId: { type: String, required: true, unique: true },
    senderId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    originX: { type: Number, required: true },
    originY: { type: Number, required: true },
    targetX: { type: Number, required: true },
    targetY: { type: Number, required: true },
    recipientTargetX: { type: Number, required: true },
    recipientTargetY: { type: Number, required: true },
    distanceDu: { type: Number, required: true, min: 0 },
    secondsPerDu: { type: Number, required: true, min: 0.01 },
    totalTravelSeconds: { type: Number, required: true, min: 0.01 },
    walletAmount: { type: Number, required: true, min: 0 },
    itemValueTotal: { type: Number, required: true, min: 0 },
    totalTransferValue: { type: Number, required: true, min: 1 },
    feeAmount: { type: Number, required: true, min: 1 },
    itemPayload: { type: [transferRunItemPayloadSchema], required: true, default: [] },
    state: {
      type: String,
      enum: ['outbound', 'resolving', 'delivered', 'failed', 'cancelled'],
      required: true,
      index: true,
    },
    departAt: { type: Date, required: true },
    arriveAt: { type: Date, required: true, index: true },
    resolvedAt: { type: Date, required: false },
    failureReason: { type: String, required: false },
    cancelledByUserId: { type: String, required: false },
  },
  { collection: 'transfer_runs', timestamps: true }
);

transferRunSchema.index({ state: 1, arriveAt: 1 });
transferRunSchema.index({ senderId: 1, state: 1, departAt: -1 });
transferRunSchema.index({ recipientId: 1, state: 1, departAt: -1 });

export const TransferRun = mongoose.model<ITransferRunDocument>('TransferRun', transferRunSchema);
