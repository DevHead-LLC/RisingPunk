import mongoose, { Document, Schema } from 'mongoose';

export type BugHuntTelemetryEventType =
  | 'launch_confirmed'
  | 'battle_resolved'
  | 'reward_granted'
  | 'storage_item_consumed';

export interface IBugHuntTelemetryEventDocument extends Document {
  eventType: BugHuntTelemetryEventType;
  occurredAt: Date;
  userId?: string;
  marchId?: string;
  bugInstanceId?: string;
  data: Record<string, unknown>;
}

const bugHuntTelemetryEventSchema = new Schema<IBugHuntTelemetryEventDocument>(
  {
    eventType: {
      type: String,
      required: true,
      enum: ['launch_confirmed', 'battle_resolved', 'reward_granted', 'storage_item_consumed'],
    },
    occurredAt: { type: Date, required: true, default: Date.now },
    userId: { type: String, required: false },
    marchId: { type: String, required: false },
    bugInstanceId: { type: String, required: false },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { collection: 'bug_hunt_telemetry_events' }
);

bugHuntTelemetryEventSchema.index({ occurredAt: -1 });
bugHuntTelemetryEventSchema.index({ eventType: 1, occurredAt: -1 });
bugHuntTelemetryEventSchema.index({ bugInstanceId: 1, occurredAt: -1 }, { sparse: true });
bugHuntTelemetryEventSchema.index({ marchId: 1, occurredAt: -1 }, { sparse: true });

export const BugHuntTelemetryEvent = mongoose.model<IBugHuntTelemetryEventDocument>(
  'BugHuntTelemetryEvent',
  bugHuntTelemetryEventSchema
);
