import mongoose, { Schema, Document } from 'mongoose';

export interface IConstructionLevel {
  level: number;
  constructionTimeMinutes: number;
  cost: number;
}

/** One document per building type (e.g. research_center, later rental_property). */
export interface IConstructionConfig extends Document {
  buildingType: string;
  levels: IConstructionLevel[];
  createdAt?: Date;
  updatedAt?: Date;
}

const constructionLevelSchema = new Schema({
  level: { type: Number, required: true, min: 1 },
  constructionTimeMinutes: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 },
}, { _id: false });

const constructionConfigSchema = new Schema({
  buildingType: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  levels: {
    type: [constructionLevelSchema],
    required: true,
    validate: {
      validator: (v: IConstructionLevel[]) => Array.isArray(v) && v.length > 0,
      message: 'levels must be a non-empty array',
    },
  },
}, {
  collection: 'construction_config',
  timestamps: true,
});

export const ConstructionConfig = mongoose.model<IConstructionConfig>(
  'ConstructionConfig',
  constructionConfigSchema
);
