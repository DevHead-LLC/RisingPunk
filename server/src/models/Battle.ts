import mongoose, { Schema, Document } from 'mongoose';
import { 
  IBattle, 
  BattlePhase, 
  NodeOwner, 
  BotType, 
  IBattalion, 
  INode
} from '../types/battle';

export interface IBattleDocument extends IBattle, Document {
  // Instance methods
  endBattle(winner: NodeOwner): Promise<void>;
}

// Battalion sub-schema
const battalionSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(BotType),
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  currentHealth: {
    type: Number,
    required: true,
    min: 0
  },
  maxHealth: {
    type: Number,
    required: true,
    min: 0
  },
  
  // PHASE 1 BATTALION COMBAT FIELDS: Added for destruction and health management
  baseHealthPerUnit: {
    type: Number,
    required: true,
    min: 1
  },
  isDestroyed: {
    type: Boolean,
    required: true,
    default: false
  },
  destroyedAt: {
    type: Number,
    required: false  // Optional - only set when battalion is actually destroyed
  },
  
  position: {
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    nodeIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 8
    }
  },
  owner: {
    type: String,
    enum: Object.values(NodeOwner),
    required: true
  },
  mark: {
    type: Number,
    required: true,
    min: 1
  },
  stats: {
    health: {
      type: Number,
      required: true
    },
    speed: {
      type: Number,
      required: true
    },
    range: {
      type: Number,
      required: true
    },
    offense: {
      type: Number,
      required: true
    },
    defense: {
      type: Number,
      required: true
    }
  }
}, { _id: false });

// Node sub-schema
const nodeSchema = new Schema({
  index: {
    type: Number,
    required: true,
    min: 0,
    max: 8
  },
  owner: {
    type: String,
    enum: Object.values(NodeOwner),
    required: true
  },
  tugOfWarProgress: {
    type: Number,
    default: 0,        // USER REQUIREMENT: Start at 0
    min: -100,         // USER REQUIREMENT: -100% = enemy wins  
    max: 100           // USER REQUIREMENT: +100% = user wins
  },
  maxCaptureThreshold: {
    type: Number,
    default: 0         // USER REQUIREMENT: Total army health (100%)
  },
  position: {
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    }
  }
}, { _id: false });

// Main battle schema
const battleSchema = new Schema({
  battleId: {
    type: String,
    required: true
  },
  attackerId: {
    type: String,
    required: true,
    index: true
  },
  defenderId: {
    type: String,
    required: true,
    index: true
  },
  phase: {
    type: String,
    enum: Object.values(BattlePhase),
    default: BattlePhase.SETUP,
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  endTime: {
    type: Date,
    required: false
  },
  winner: {
    type: String,
    enum: Object.values(NodeOwner),
    required: false
  },
  countdown: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    default: 3
  },
  battleTime: {
    type: Number,
    required: true,
    min: 0,
    max: 45,
    default: 0
  },

  battalions: [battalionSchema],
  nodes: [nodeSchema]
}, {
  collection: 'battles',
  timestamps: true
});

// Indexes for efficient queries
battleSchema.index({ battleId: 1 }, { unique: true });
battleSchema.index({ attackerId: 1, phase: 1 });
battleSchema.index({ defenderId: 1, phase: 1 });
battleSchema.index({ phase: 1, startTime: 1 });
battleSchema.index({ 'battalions.owner': 1 });

// Instance methods
battleSchema.methods.endBattle = async function(winner: NodeOwner): Promise<void> {
  this.phase = BattlePhase.COMPLETE;
  this.winner = winner;
  this.endTime = new Date();
  await this.save();
};

export const Battle = mongoose.model<IBattleDocument>('Battle', battleSchema); 