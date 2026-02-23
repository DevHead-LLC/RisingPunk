import mongoose, { Schema, Document } from 'mongoose';

export interface IPrivateMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  senderUsername: string;
  message: string;
  originalMessage?: string;
  readAt: Date | null;
  isFromAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const privateMessageSchema = new Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  senderUsername: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true,
  },
  originalMessage: {
    type: String,
    required: false,
    maxlength: 500,
    trim: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  isFromAdmin: {
    type: Boolean,
    default: false,
  },
}, {
  collection: 'privateMessages',
  timestamps: true,
});

privateMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
privateMessageSchema.index({ recipientId: 1, readAt: 1 });

export const PrivateMessage = mongoose.model<IPrivateMessage>('PrivateMessage', privateMessageSchema);

/** Canonical conversation key (sorted user ids) so thread is unique regardless of who initiated. */
export function getConversationKey(userId1: mongoose.Types.ObjectId, userId2: mongoose.Types.ObjectId): string {
  const a = userId1.toString();
  const b = userId2.toString();
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}
