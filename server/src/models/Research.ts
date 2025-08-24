import mongoose, { Schema, Document } from 'mongoose';

export interface IResearch extends Document {
  categoryId: string;
  name: string;
  levelRequirement: number;
  balanceRequirement: number;
  dependencies: string[];
  image: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  }
}, {
  collection: 'research',
  timestamps: true
});

export const Research = mongoose.model<IResearch>('Research', researchSchema);
