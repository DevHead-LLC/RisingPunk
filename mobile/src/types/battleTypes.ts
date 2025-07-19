/**
 * @file battleTypes.ts
 * @description Core type definitions for the battle system
 * @maintainer Single source of truth for battle-related types
 */

// Node and Network Types
export type NodeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type NodePosition = { x: number; y: number };

export interface BattleNode {
  index: NodeIndex;
  position: NodePosition;
  owner: 'neutral' | 'user' | 'enemy';
  health?: number;
  captureProgress?: number;
}

// Battalion Types
export enum BattalionType {
  GUARDIAN = 'guardian',
  PHREAK = 'phreak',
  BREACHER = 'breacher'
}

export interface Battalion {
  id: string;
  type: BattalionType;
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  position: NodePosition;
  currentNode: NodeIndex;
  owner: 'user' | 'enemy';
}

// Battle State Types
export enum BattlePhase {
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

export interface BattleState {
  phase: BattlePhase;
  countdown: number;
  battleTime: number;
  maxBattleTime: number;
}

// Network Connection Type
export type NetworkConnection = [NodeIndex, NodeIndex];
