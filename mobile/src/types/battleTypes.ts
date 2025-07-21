/**
 * @file battleTypes.ts
 * @description Core type definitions for the battle system
 * @maintainer Single source of truth for battle-related types
 */

// Node and Network Types
export type NodePosition = { x: number; y: number };

// BattleNode interface moved to server authority - client receives read-only data via API

// Battalion Types
export enum BattalionType {
  GUARDIAN = 'guardian',
  PHREAK = 'phreak',
  BREACHER = 'breacher'
}

// Battalion interface moved to server authority - client receives read-only data via API

// Battle State Types
export enum BattlePhase {
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

// BattleState interface moved to battleApi.ts (server response format)

// Network Connection Type (server authority - matches server format)
export interface NetworkConnection {
  from: number;
  to: number;
}

// Line Properties Type (server authority - matches server format)
export interface LineProperties {
  length: number;
  angle: number;
  left: number;
  top: number;
}

// Movement State Type (shared between server and client)
export interface MovementState {
  battalionId: string;
  startPosition: { x: number; y: number; nodeIndex: number };
  targetPosition: { x: number; y: number; nodeIndex: number };
  movementStatus: 'stationary' | 'moving' | 'arrived';
  startTime: number; // Timestamp when movement began (Date.now())
  estimatedDuration: number; // Total movement duration in milliseconds
  networkPath: number[]; // [startNode, targetNode] from TargetingService
  attackRangePosition?: { x: number; y: number };
  isWithinAttackRange: boolean;
}
