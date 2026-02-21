import mongoose, { Schema, Document } from 'mongoose';
import { IResearchFeature, IResearchFeatureRef } from './Research';

/** Stored research feature definition (no user state). Source of truth for feature metadata; merge with file fallback per category. */
export interface IResearchFeatureDefinition extends Document {
  categoryId: string;
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  researchTimeHours: number;
  requiredFeatureRefs: IResearchFeatureRef[];
  researchCenterLevelRequirement?: number;
  effect: IResearchFeature['effect'];
  createdAt: Date;
  updatedAt: Date;
}

const researchFeatureDefinitionSchema = new Schema({
  categoryId: {
    type: String,
    required: true,
    index: true
  },
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
  researchTimeHours: {
    type: Number,
    required: true,
    min: 0
  },
  requiredFeatureRefs: [{
    categoryId: { type: String, required: true },
    featureId: { type: String, required: true }
  }],
  researchCenterLevelRequirement: { type: Number, required: false },
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
}, {
  collection: 'research_feature_definitions',
  timestamps: true,
  id: false
});

researchFeatureDefinitionSchema.index({ categoryId: 1, id: 1 }, { unique: true });

/** Convert a DB document to IResearchFeature shape (no user state). */
export function toResearchFeature(doc: IResearchFeatureDefinition): IResearchFeature {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    unlockCost: doc.unlockCost,
    levelRequirement: doc.levelRequirement,
    isUnlocked: false,
    researchTimeHours: doc.researchTimeHours,
    requiredFeatureRefs: doc.requiredFeatureRefs ?? [],
    researchCenterLevelRequirement: doc.researchCenterLevelRequirement,
    effect: doc.effect
  };
}

export const ResearchFeatureDefinition = mongoose.model<IResearchFeatureDefinition>(
  'ResearchFeatureDefinition',
  researchFeatureDefinitionSchema
);
