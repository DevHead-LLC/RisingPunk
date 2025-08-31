import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivitySummary extends Document {
  userId: string;
  date: string; // YYYY-MM-DD format
  ipAddress: string;
  deviceId: string;
  userAgent: string;
  totalRequests: number;
  uniqueEndpoints: Set<string>;
  lastActivity: Date;
  expiresAt: Date;
}

const userActivitySummarySchema = new Schema<IUserActivitySummary>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  uniqueEndpoints: [{
    type: String
  }],
  lastActivity: {
    type: Date,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  collection: 'user_activity_summaries',
  timestamps: true
});

// TTL index to automatically delete documents after 30 days
userActivitySummarySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for efficient querying
userActivitySummarySchema.index({ userId: 1, date: -1 });
userActivitySummarySchema.index({ deviceId: 1, date: -1 });
userActivitySummarySchema.index({ ipAddress: 1, date: -1 });

// Pre-save middleware to set expiration date (30 days from creation)
userActivitySummarySchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

export const UserActivitySummary = mongoose.model<IUserActivitySummary>('UserActivitySummary', userActivitySummarySchema);
