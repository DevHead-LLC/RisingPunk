import mongoose, { Schema, Document } from 'mongoose';

export interface IResearchFeature {
  id: string;
  isUnlocked: boolean;
  unlockedAt: Date | null;
}

export interface IResearchUser extends Document {
  userId: mongoose.Types.ObjectId;
  researchId: mongoose.Types.ObjectId;
  isUnlocked: boolean;
  unlockedAt: Date | null;
  unlockCost: number;
  features: IResearchFeature[];
  createdAt: Date;
  updatedAt: Date;
}

const researchFeatureSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  isUnlocked: {
    type: Boolean,
    default: false
  },
  unlockedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const researchUserSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  researchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Research',
    required: true
  },
  isUnlocked: {
    type: Boolean,
    default: false
  },
  unlockedAt: {
    type: Date,
    default: null
  },
  unlockCost: {
    type: Number,
    default: 0,
    min: 0
  },
  features: [researchFeatureSchema]
}, {
  collection: 'researchUsers',
  timestamps: true
});

// Compound index for unique user-research combinations
researchUserSchema.index({ userId: 1, researchId: 1 }, { unique: true });

// Indexes for performance
researchUserSchema.index({ userId: 1 });
researchUserSchema.index({ researchId: 1 });

export const ResearchUser = mongoose.model<IResearchUser>('ResearchUser', researchUserSchema);
