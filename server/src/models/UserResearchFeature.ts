import mongoose, { Schema, Document } from 'mongoose';

export interface IUserResearchFeature extends Document {
  userId: mongoose.Types.ObjectId;
  categoryId: string; // References Research.categoryId
  featureId: string; // References the specific feature within the category
  isUnlocked: boolean;
  unlockedAt: Date | null;
  isResearching: boolean;
  researchStartedAt: Date | null;
  researchCompletesAt: Date | null;
  /** Original research duration in seconds when research started; used for crew backup formula so per-helper reduction does not degrade as completesAt is reduced. */
  originalResearchTotalSeconds?: number | null;
  researchTimeHours: number;
  unlockCost: number;
  createdAt: Date;
  updatedAt: Date;
}

const userResearchFeatureSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  categoryId: {
    type: String,
    required: true,
    enum: [
      'home-defense',
      'hack-ability', 
      'financial',
      'hack-crew',
      'npc',
      'cash-flow',
      'construction',
      'battle-mechanics',
      'gear',
      'investments'
    ],
    index: true
  },
  featureId: {
    type: String,
    required: true,
    index: true
  },
  isUnlocked: {
    type: Boolean,
    default: false
  },
  unlockedAt: {
    type: Date,
    default: null
  },
  isResearching: {
    type: Boolean,
    default: false
  },
  researchStartedAt: {
    type: Date,
    default: null
  },
  researchCompletesAt: {
    type: Date,
    default: null
  },
  originalResearchTotalSeconds: {
    type: Number,
    default: null
  },
  researchTimeHours: {
    type: Number,
    default: 4,
    min: 0
  },
  unlockCost: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  collection: 'userResearchFeatures',
  timestamps: true
});

// Compound index for unique user-feature combinations
userResearchFeatureSchema.index({ userId: 1, categoryId: 1, featureId: 1 }, { unique: true });

// Indexes for performance
userResearchFeatureSchema.index({ userId: 1, categoryId: 1 });
userResearchFeatureSchema.index({ userId: 1, isUnlocked: 1 });
userResearchFeatureSchema.index({ userId: 1, isResearching: 1 });

export const UserResearchFeature = mongoose.model<IUserResearchFeature>('UserResearchFeature', userResearchFeatureSchema);
