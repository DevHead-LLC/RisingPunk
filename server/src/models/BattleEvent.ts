import mongoose, { Schema, Document } from 'mongoose';
import { IBattleEvent, EventType } from '../types/battle';

export interface IBattleEventDocument extends IBattleEvent, Document {}

const battleEventSchema = new Schema({
  battleId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: Object.values(EventType),
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  actorId: {
    type: String,
    required: false // Some events are system-generated
  },
  data: {
    type: Schema.Types.Mixed,
    required: true
  }
}, {
  collection: 'battle_events',
  timestamps: true
});

// Compound index for efficient queries by battle and time
battleEventSchema.index({ battleId: 1, timestamp: 1 });

// Index for querying events by type
battleEventSchema.index({ eventType: 1 });

// Index for querying events by actor
battleEventSchema.index({ actorId: 1 });

export const BattleEvent = mongoose.model<IBattleEventDocument>('BattleEvent', battleEventSchema); 