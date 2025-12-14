import mongoose, { Schema, Document } from 'mongoose';

export interface ICrewChatMessage extends Document {
  crewId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  message: string;
  originalMessage?: string; // Original unfiltered content for moderation reports
  createdAt: Date;
  updatedAt: Date;
}

const crewChatMessageSchema = new Schema({
  crewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  originalMessage: {
    type: String,
    required: false,
    maxlength: 500,
    trim: true
  }
}, {
  collection: 'crewChatMessages',
  timestamps: true
});

// Index for efficient querying by crewId and timestamp
crewChatMessageSchema.index({ crewId: 1, createdAt: -1 });

export const CrewChatMessage = mongoose.model<ICrewChatMessage>('CrewChatMessage', crewChatMessageSchema);

