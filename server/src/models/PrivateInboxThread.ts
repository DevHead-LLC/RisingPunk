import mongoose, { Schema, Document } from 'mongoose';

export interface IPrivateInboxThread extends Document {
  userId: mongoose.Types.ObjectId;
  /** Stable id for the conversation — see privateThreadCanonicalKey.ts */
  canonicalThreadKey: string;
  lastActivityAt: Date;
  /** User hid/removed this thread from their inbox; new messages clear it (revive). */
  dismissed: boolean;
}

const privateInboxThreadSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    canonicalThreadKey: {
      type: String,
      required: true,
      trim: true,
    },
    lastActivityAt: {
      type: Date,
      required: true,
    },
    dismissed: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'privateInboxThreads',
    timestamps: false,
  }
);

privateInboxThreadSchema.index({ userId: 1, canonicalThreadKey: 1 }, { unique: true });
privateInboxThreadSchema.index({ userId: 1, dismissed: 1, lastActivityAt: -1 });

export const PrivateInboxThread = mongoose.model<IPrivateInboxThread>(
  'PrivateInboxThread',
  privateInboxThreadSchema
);
