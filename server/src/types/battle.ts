import { Document } from 'mongoose';

export interface MovementState {
  battalionId: string;
  startPosition: { x: number; y: number; nodeIndex: number };
  targetPosition: { x: number; y: number; nodeIndex: number };
  movementStatus: 'stationary' | 'moving' | 'arrived';
  startTime: number;
  estimatedDuration: number;
  networkPath: number[];
  attackRangePosition?: { x: number; y: number };
  isWithinAttackRange: boolean;
  movementType?: 'initial' | 'retargeting' | 'interrupted_recovery';
  fullPath?: number[];
  currentPathIndex?: number;
  finalTarget?: number;
  isInterruptible?: boolean;
  wasInterrupted?: boolean;
  interruptionPosition?: { x: number; y: number; nodeIndex: number };
  needsRetargetingOnArrival?: boolean;
  originalInterruptionPosition?: { x: number; y: number; nodeIndex: number };
  wasPositionUpdated?: boolean;
  lastPositionLog?: number;
}

export enum BattlePhase {
  SETUP = 'setup',
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

export enum NodeOwner {
  USER = 'user',
  ENEMY = 'enemy',
  NEUTRAL = 'neutral'
}

export enum BotType {
  GUARDIAN = 'guardian',
  BREACHER = 'breacher',
  PHREAK = 'phreak'
}

export interface BotStats {
  health: number;
  speed: number;
  range: number;
  offense: number;
  defense: number;
}

export interface BattalionPosition {
  x: number;
  y: number;
  nodeIndex: number;
}

export interface IBattalion {
  id: string;
  type: BotType;
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  baseHealthPerUnit: number;
  isDestroyed: boolean;
  destroyedAt?: number;
  position: BattalionPosition;
  owner: NodeOwner;
  mark: number;
  stats: BotStats;
}

export interface INode {
  index: number;
  owner: NodeOwner;
  tugOfWarProgress: number;
  maxCaptureThreshold: number;
  position: {
    x: number;
    y: number;
  };
}

export interface BattalionTargetingResult {
  battalionId: string;
  battalionType: BotType;
  battalionOwner: NodeOwner;
  startingNode: number;
  targetNode: number;
  isValidTarget: boolean;
  reason?: string;
  targetType?: 'neutral_node' | 'enemy_battalion';
  targetBattalionId?: string;
}

export interface IBattle extends Document {
  battleId: string;
  attackerId: string;
  defenderId: string;
  phase: BattlePhase;
  startTime: Date;
  endTime?: Date;
  winner?: NodeOwner;
  countdown: number;
  battleTime: number;
  startingBattalions?: IBattalion[];
  battalions: IBattalion[];
  nodes: INode[];
  createdAt: Date;
  updatedAt: Date;
}

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

export { NetworkConnection } from '../config/networkConfig';
export { LineProperties } from '../config/networkConfig';

export interface ClientBattalion {
  id: string;
  type: BotType;
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  baseHealthPerUnit: number;
  isDestroyed: boolean;
  destroyedAt?: number;
  position: { x: number; y: number };
  isUser: boolean;
  mark: number;
  stats: BotStats;
  movementState?: MovementState;
}

export interface BattleStateResponse {
  battleId: string;
  phase: BattlePhase;
  countdown: number;
  battleTime: number;
  timeRemaining: number;
  winner?: NodeOwner;
  battalions: ClientBattalion[];
  nodes: INode[];
  networkConnections: import('../config/networkConfig').NetworkConnection[];
  lineProperties: import('../config/networkConfig').LineProperties[];
  targetingResults?: any[];
  movementStates?: MovementState[];
  retargetingStatus?: {nodeIndex: number, affectedBattalionIds: string[]};
  lastUpdated: Date;
  battleEndData?: BattleEndData;
}

export interface BattalionLoss {
  battalionId: string;
  type: BotType;
  mark: number;
  startingQuantity: number;
  endingQuantity: number;
  startingPoints: number;
  endingPoints: number;
  losses: number;
  owner: NodeOwner;
}

export interface BattleLosses {
  userLosses: number;
  enemyLosses: number;
  winner: NodeOwner;
  userStartingPoints: number;
  userEndingPoints: number;
  enemyStartingPoints: number;
  enemyEndingPoints: number;
  battalionLosses: BattalionLoss[];
  victoryMessage: string;
  endCondition: 'timer' | 'elimination';
  battleDuration: number;
}

export interface BattleEndData {
  battleId: string;
  winner: NodeOwner;
  losses: BattleLosses;
  endTime: Date;
  phase: BattlePhase;
  experienceGained?: number;
  hackerRewards?: number;
}

export interface RetargetingQueueTask {
  trigger: string;
  triggerType: 'node_capture' | 'battalion_destruction' | 'interrupted_recovery' | 'missing_target';
  battleId: string;
  timestamp: number;
  capturedNodeIndex?: number;
  affectedBattalionIds?: string[];
  destroyedBattalionId?: string;
  battalionId?: string;
} 