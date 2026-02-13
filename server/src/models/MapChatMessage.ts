import mongoose, { Schema, Document } from 'mongoose';

export interface IMapChatMessage extends Document {
  mapName: string;
  userId: mongoose.Types.ObjectId;
  username: string;
  message: string;
  originalMessage?: string; // Original unfiltered content for moderation reports
  createdAt: Date;
  updatedAt: Date;
}

const mapChatMessageSchema = new Schema({
  mapName: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  username: {
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
}, {
  collection: 'mapChatMessages',
  timestamps: true,
});

// Index for efficient querying by mapName and timestamp
mapChatMessageSchema.index({ mapName: 1, createdAt: -1 });

export const MapChatMessage = mongoose.model<IMapChatMessage>('MapChatMessage', mapChatMessageSchema);
