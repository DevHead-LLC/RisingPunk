import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivityLog extends Document {
  userId: string; // Allow both ObjectId strings and 'anonymous'
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  endpoint: string;
  method: string;
  action: string;
  gameAction?: {
    type: 'battle' | 'movement' | 'purchase' | 'login' | 'logout' | 'api_call';
    details?: any;
  };
  timestamp: Date;
  expiresAt: Date;
}

const userActivityLogSchema = new Schema<IUserActivityLog>({
  userId: {
    type: String, // Allow both ObjectId and 'anonymous' string
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  action: {
    type: String,
    required: true
  },
  gameAction: {
    type: {
      type: String,
      enum: ['battle', 'movement', 'purchase', 'login', 'logout', 'api_call'],
      required: false
    },
    details: {
      type: Schema.Types.Mixed,
      required: false
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  collection: 'user_activity_logs',
  timestamps: true
});

// TTL index to automatically delete documents after 30 days
userActivityLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for efficient querying
userActivityLogSchema.index({ userId: 1, timestamp: -1 });
userActivityLogSchema.index({ deviceId: 1, timestamp: -1 });
userActivityLogSchema.index({ ipAddress: 1, timestamp: -1 });

// Pre-save middleware to set expiration date (30 days from creation)
userActivityLogSchema.pre('save', function(next) {
  if (!(this as any).expiresAt) {
    (this as any).expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

export const UserActivityLog = mongoose.model<IUserActivityLog>('UserActivityLog', userActivityLogSchema);
