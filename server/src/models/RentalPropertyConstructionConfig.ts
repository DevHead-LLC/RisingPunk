import mongoose, { Schema, Document } from 'mongoose';

/** Per-property-level rates ($/sec). Garage only from level 7+. */
export interface IPropertyLevelRates {
  bath: number;
  bed1: number;
  livingRoom: number;
  kitchen: number;
  garage?: number;
}

export interface IPropertyBuildLevel {
  level: number;
  constructionTimeMinutes: number;
  cost: number;
  rates: IPropertyLevelRates;
}

/** Per-room add rates for a remodel tier. Garage only from room level 5+. */
export interface IRoomRemodelAddRates {
  bathroom: number;
  bedroom: number;
  livingRoom: number;
  kitchen: number;
  garage?: number;
}

export interface IRoomRemodelLevel {
  roomLevel: number;
  constructionTimeMinutes: number;
  cost: number;
  minPropertyLevel: number;
  addRates: IRoomRemodelAddRates;
}

/** Single document in construction_config for buildingType 'rental_property'. */
export interface IRentalPropertyConstructionConfig extends Document {
  buildingType: 'rental_property';
  propertyLevels: IPropertyBuildLevel[];
  roomRemodelLevels: IRoomRemodelLevel[];
  createdAt?: Date;
  updatedAt?: Date;
}

const propertyLevelRatesSchema = new Schema({
  bath: { type: Number, required: true },
  bed1: { type: Number, required: true },
  livingRoom: { type: Number, required: true },
  kitchen: { type: Number, required: true },
  garage: { type: Number, required: false },
}, { _id: false });

const propertyBuildLevelSchema = new Schema({
  level: { type: Number, required: true, min: 1 },
  constructionTimeMinutes: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 },
  rates: { type: propertyLevelRatesSchema, required: true },
}, { _id: false });

const roomRemodelAddRatesSchema = new Schema({
  bathroom: { type: Number, required: true },
  bedroom: { type: Number, required: true },
  livingRoom: { type: Number, required: true },
  kitchen: { type: Number, required: true },
  garage: { type: Number, required: false },
}, { _id: false });

const roomRemodelLevelSchema = new Schema({
  roomLevel: { type: Number, required: true, min: 2 },
  constructionTimeMinutes: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 },
  minPropertyLevel: { type: Number, required: true, min: 1 },
  addRates: { type: roomRemodelAddRatesSchema, required: true },
}, { _id: false });

const rentalPropertyConstructionConfigSchema = new Schema({
  buildingType: {
    type: String,
    required: true,
    unique: true,
    index: true,
    enum: ['rental_property'],
  },
  propertyLevels: {
    type: [propertyBuildLevelSchema],
    required: true,
    validate: {
      validator: (v: IPropertyBuildLevel[]) => Array.isArray(v) && v.length > 0,
      message: 'propertyLevels must be a non-empty array',
    },
  },
  roomRemodelLevels: {
    type: [roomRemodelLevelSchema],
    required: true,
    validate: {
      validator: (v: IRoomRemodelLevel[]) => Array.isArray(v) && v.length > 0,
      message: 'roomRemodelLevels must be a non-empty array',
    },
  },
}, {
  collection: 'construction_config',
  timestamps: true,
});

export const RentalPropertyConstructionConfig = mongoose.model<IRentalPropertyConstructionConfig>(
  'RentalPropertyConstructionConfig',
  rentalPropertyConstructionConfigSchema
);
