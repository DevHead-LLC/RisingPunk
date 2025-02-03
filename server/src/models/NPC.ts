import mongoose, { Document, Model } from 'mongoose';

interface INPC extends Document {
  name: string;
  type: string;
  level: number;
  position: { x: number; y: number };
  army: { breacher: number; guardian: number; phreak: number };
  armyBonus: { strength: number; defense: number; speed: number; health: number };
}

interface INPCModel extends Model<INPC> {
  calculateArmySize(level: number): number;
}

const NPCSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['GOVERNMENT', 'BANK', 'CORPORATION', 'SECURITY'],
    required: true 
  },
  level: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5 
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  army: {
    breacher: { type: Number, default: 0 },
    guardian: { type: Number, default: 0 },
    phreak: { type: Number, default: 0 }
  },
  // Reference bot stats from DigitalBarracksScreen
  armyBonus: {
    strength: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    health: { type: Number, default: 0 }
  }
}); 

NPCSchema.pre<INPC>('save', function(next) {
  if (this.isNew) {
    const size = (this.constructor as INPCModel).calculateArmySize(this.level);
    this.army = {
      breacher: size,
      guardian: size,
      phreak: size
    };
  }
  next();
});

NPCSchema.statics.calculateArmySize = function(level: number): number {
  const baseSize = 33;
  return baseSize * Math.pow(3, level - 1);
}; 

export const NPC = mongoose.model<INPC, INPCModel>('NPC', NPCSchema); 