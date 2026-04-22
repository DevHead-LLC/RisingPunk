import mongoose, { Schema, Document } from 'mongoose';
import { ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH } from '../constants/privateMessageCaps';

export interface IPrivateMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  senderUsername: string;
  message: string;
  originalMessage?: string;
  readAt: Date | null;
  isFromAdmin: boolean;
  /** When true, this message was sent via admin "message all"; replies are disabled. */
  isAdminBroadcast?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Appended to every admin broadcast message (one-way, no reply). */
export const ADMIN_BROADCAST_FOOTER =
  'Thank you for playing RisingPunk! Please contact support at support@risingpunk.com for help or feedback.';

/** Largest legitimate stored `message` (admin broadcast: body + `\\n\\n` + {@link ADMIN_BROADCAST_FOOTER}). */
export const PRIVATE_MESSAGE_MESSAGE_MAX_LENGTH =
  ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH + 2 + ADMIN_BROADCAST_FOOTER.length;

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
    trim: true,
    maxlength: PRIVATE_MESSAGE_MESSAGE_MAX_LENGTH,
  },
  originalMessage: {
    type: String,
    required: false,
    /** User ↔ user DMs are capped at the route; admin broadcast body may be long (stored for audit). */
    maxlength: ADMIN_BROADCAST_BODY_MAX_INPUT_LENGTH,
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
  isAdminBroadcast: {
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
