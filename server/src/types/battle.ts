import { Document } from 'mongoose';
import { MovementState } from '../../../mobile/src/types/battleTypes';

// Battle phases from intentions document
export enum BattlePhase {
  SETUP = 'setup',
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETE = 'complete'
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
  stats: BotStats;
}

// Node interface for embedded documents
export interface INode {
  index: number;
  owner: NodeOwner;
  tugOfWarProgress: number;      // USER REQUIREMENT: -100 to +100
  maxCaptureThreshold: number;   // USER REQUIREMENT: Total army health (100%)
  position: {
    x: number;
    y: number;
  };
}

// Battalion targeting result interface
export interface BattalionTargetingResult {
  battalionId: string;
  battalionType: BotType;
  battalionOwner: NodeOwner;
  startingNode: number;
  targetNode: number;
  isValidTarget: boolean;
  reason?: string;
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
  screenDimensions: {
    width: number;
    height: number;
  };
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

// Network connection interface (imported from networkConfig - single source of truth)
export { NetworkConnection } from '../config/networkConfig';

// Line properties interface (imported from networkConfig - single source of truth)
export { LineProperties } from '../config/networkConfig';

// Client-compatible battalion for API response
export interface ClientBattalion {
  id: string;
  type: BotType;
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  nodeIndex: number;
  isUser: boolean;
  mark: number;
  stats: BotStats;
  movementState?: MovementState;
}

// Battle state response interface (for client)
export interface BattleStateResponse {
  battleId: string;
  phase: BattlePhase;
  countdown: number;
  battleTime: number;
  winner?: NodeOwner;
  battalions: ClientBattalion[];
  nodes: INode[];
  networkConnections: import('../config/networkConfig').NetworkConnection[]; // Server-provided network topology
  lineProperties: import('../config/networkConfig').LineProperties[];        // Server-calculated line properties
  targetingResults?: any[];               // Initial targeting data
  movementStates?: MovementState[];        // Movement data for battalion animations
  lastUpdated: Date;
} 