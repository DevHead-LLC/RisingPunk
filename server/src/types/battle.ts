import { Document } from 'mongoose';

// Battle phases from intentions document
export enum BattlePhase {
  SETUP = 'setup',
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

// Event types for battle logging
export enum EventType {
  BATTLE_START = 'battle_start',
  BATTLE_END = 'battle_end',
  BATTALION_MOVE = 'battalion_move',
  BATTALION_ATTACK = 'battalion_attack',
  BATTALION_DAMAGE = 'battalion_damage',
  BATTALION_DESTROYED = 'battalion_destroyed',
  NODE_CAPTURED = 'node_captured',
  PHASE_CHANGE = 'phase_change'
}

// Node ownership types
export enum NodeOwner {
  USER = 'user',
  ENEMY = 'enemy',
  NEUTRAL = 'neutral'
}

// Bot types from intentions document
export enum BotType {
  GUARDIAN = 'guardian',
  BREACHER = 'breacher',
  PHREAK = 'phreak'
}

// Bot stats interface
export interface BotStats {
  health: number;
  speed: number;
  range: number;
  offense: number;
  defense: number;
}

// Battalion position interface
export interface BattalionPosition {
  x: number;
  y: number;
  nodeIndex: number;
}

// Battalion interface for embedded documents
export interface IBattalion {
  id: string;
  type: BotType;
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  position: BattalionPosition;
  owner: NodeOwner;
  mark: number;
  targetNode?: number;
  targetBattalion?: string;
  remainingPath?: number[];
  finalTarget?: number;
  stats: BotStats;
}

// Node interface for embedded documents
export interface INode {
  index: number;
  owner: NodeOwner;
  captureProgress: number; // -100 to +100 for neutral nodes
  health: number; // Only for neutral nodes (3, 4, 5)
  position: {
    x: number;
    y: number;
  };
}

// Battle event interface
export interface IBattleEvent {
  battleId: string;
  eventType: EventType;
  timestamp: Date;
  actorId?: string; // User ID who triggered the event
  data: Record<string, any>; // Flexible data object
}

// Main battle interface
export interface IBattle extends Document {
  battleId: string;
  attackerId: string; // User ID
  defenderId: string; // User ID (could be AI for now)
  phase: BattlePhase;
  startTime: Date;
  endTime?: Date;
  winner?: NodeOwner;
  countdown: number; // 3 to 0
  battleTime: number; // 0 to 20
  battalions: IBattalion[];
  nodes: INode[];
  createdAt: Date;
  updatedAt: Date;
}

// Battle creation request interface
export interface CreateBattleRequest {
  attackerId: string;
  defenderId: string;
  attackerBattalions: Array<{
    type: BotType;
    quantity: number;
    mark: number;
  }>;
  defenderBattalions: Array<{
    type: BotType;
    quantity: number;
    mark: number;
  }>;
}

// Battle state response interface (for client)
export interface BattleStateResponse {
  battleId: string;
  phase: BattlePhase;
  countdown: number;
  battleTime: number;
  winner?: NodeOwner;
  battalions: IBattalion[];
  nodes: INode[];
  lastUpdated: Date;
  movementData?: {
    updateInterval: number;
    lastMovementUpdate: Date;
  };
} 