import mongoose, { Schema, Document } from 'mongoose';

export interface IResearchFeature {
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  isResearching?: boolean;
  researchStartedAt?: Date;
  researchCompletesAt?: Date;
  /** Duration in hours (fractional allowed, e.g. 5/60 for 5 minutes). */
  researchTimeHours?: number;
  /** Feature(s) that must be unlocked before this feature can be started (AND). */
  requiredFeatureRefs?: IResearchFeatureRef[];
  /** Required Research Center building level (1–20). User must have at least this level to start research. */
  researchCenterLevelRequirement?: number;
  effect: {
    type: 'unlock' | 'improvement' | 'reduction' | 'special';
    value: number | string;
    target?: string;
  };
}

export interface IResearchFeatureRef {
  categoryId: string;
  featureId: string;
}

export interface IResearch extends Document {
  categoryId: string;
  name: string;
  levelRequirement: number;
  balanceRequirement: number;
  dependencies: string[];
  image: string;
  description: string;
  features: IResearchFeature[];
  /** Cost to unlock this category (paid at unlock). If missing, server uses fallback. */
  unlockCost?: number;
  /** Required Research Center building level (1–20). If set, user must have at least this level. */
  researchCenterLevelRequirement?: number;
  /** Features that must be unlocked (or completed) before this category can unlock. */
  requiredFeatureRefs?: IResearchFeatureRef[];
  createdAt: Date;
  updatedAt: Date;
}

const researchFeatureSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  unlockCost: {
    type: Number,
    required: true,
    min: 0
  },
  levelRequirement: {
    type: Number,
    required: true,
    min: 0
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
  researchTimeHours: {
    type: Number,
    default: 4
  },
  requiredFeatureRefs: [{
    categoryId: { type: String, required: true },
    featureId: { type: String, required: true }
  }],
  effect: {
    type: {
      type: String,
      enum: ['unlock', 'improvement', 'reduction', 'special'],
      required: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    target: String
  }
}, { _id: false });

const researchSchema = new Schema({
  categoryId: {
    type: String,
    required: true,
    unique: true,
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
      'investments',
      'swarm',
      'hunting'
    ]
  },
  name: {
    type: String,
    required: true
  },
  levelRequirement: {
    type: Number,
    required: true,
    min: 0
  },
  balanceRequirement: {
    type: Number,
    required: true,
    min: 0
  },
  dependencies: [{
    type: String,
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
      'investments',
      'swarm',
      'hunting'
    ]
  }],
  image: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  features: [researchFeatureSchema],
  unlockCost: { type: Number, required: false },
  researchCenterLevelRequirement: { type: Number, required: false },
  requiredFeatureRefs: [{
    categoryId: { type: String, required: true },
    featureId: { type: String, required: true }
  }]
}, {
  collection: 'research',
  timestamps: true
});

export const Research = mongoose.model<IResearch>('Research', researchSchema);
