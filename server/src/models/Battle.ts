import mongoose, { Schema, Document } from 'mongoose';
import { 
  IBattle, 
  BattlePhase, 
  NodeOwner, 
  BotType, 
  IBattalion, 
  INode,
  BattalionPosition 
} from '../types/battle';

export interface IBattleDocument extends IBattle, Document {
  // Instance methods
  updatePhase(newPhase: BattlePhase): Promise<void>;
  updateTimer(countdown: number, battleTime: number): Promise<void>;
  addBattalion(battalion: IBattalion): Promise<void>;
  updateBattalion(battalionId: string, updates: Partial<IBattalion>): Promise<void>;
  removeBattalion(battalionId: string): Promise<void>;
  updateNode(nodeIndex: number, updates: Partial<INode>): Promise<void>;
  endBattle(winner: NodeOwner): Promise<void>;
}

// Static methods interface
export interface IBattleModel extends mongoose.Model<IBattleDocument> {
  findByBattleId(battleId: string): Promise<IBattleDocument | null>;
  findActiveBattles(): Promise<IBattleDocument[]>;
  findByUser(userId: string): Promise<IBattleDocument[]>;
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
    max: 20,
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
battleSchema.methods.updatePhase = async function(newPhase: BattlePhase): Promise<void> {
  this.phase = newPhase;
  if (newPhase === BattlePhase.COMPLETE) {
    this.endTime = new Date();
  }
  await this.save();
};

battleSchema.methods.updateTimer = async function(countdown: number, battleTime: number): Promise<void> {
  this.countdown = countdown;
  this.battleTime = battleTime;
  await this.save();
};

battleSchema.methods.addBattalion = async function(battalion: IBattalion): Promise<void> {
  this.battalions.push(battalion);
  await this.save();
};

battleSchema.methods.updateBattalion = async function(battalionId: string, updates: Partial<IBattalion>): Promise<void> {
  const battalionIndex = this.battalions.findIndex((b: IBattalion) => b.id === battalionId);
  if (battalionIndex !== -1) {
    this.battalions[battalionIndex] = { ...this.battalions[battalionIndex], ...updates };
    await this.save();
  }
};

battleSchema.methods.removeBattalion = async function(battalionId: string): Promise<void> {
  this.battalions = this.battalions.filter((b: IBattalion) => b.id !== battalionId);
  await this.save();
};

battleSchema.methods.updateNode = async function(nodeIndex: number, updates: Partial<INode>): Promise<void> {
  const node = this.nodes.find((n: INode) => n.index === nodeIndex);
  if (node) {
    Object.assign(node, updates);
    await this.save();
  }
};

battleSchema.methods.endBattle = async function(winner: NodeOwner): Promise<void> {
  this.phase = BattlePhase.COMPLETE;
  this.winner = winner;
  this.endTime = new Date();
  await this.save();
};

// Static methods
battleSchema.statics.findByBattleId = function(battleId: string) {
  return this.findOne({ battleId });
};

battleSchema.statics.findActiveBattles = function() {
  return this.find({ 
    phase: { $in: [BattlePhase.COUNTDOWN, BattlePhase.ACTIVE] } 
  });
};

battleSchema.statics.findByUser = function(userId: string) {
  return this.find({
    $or: [
      { attackerId: userId },
      { defenderId: userId }
    ]
  }).sort({ startTime: -1 });
};

export const Battle = mongoose.model<IBattleDocument, IBattleModel>('Battle', battleSchema); 