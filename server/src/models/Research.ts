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
  researchTimeHours?: number;
  effect: {
    type: 'unlock' | 'improvement' | 'reduction' | 'special';
    value: number | string;
    target?: string;
  };
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
      'investments'
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
      'investments'
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
  features: [researchFeatureSchema]
}, {
  collection: 'research',
  timestamps: true
});

export const Research = mongoose.model<IResearch>('Research', researchSchema);
