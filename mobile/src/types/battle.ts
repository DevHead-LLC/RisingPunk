import { BotType, BotStats } from '../hooks/useBots';

export type Path = number[];

// Use the BotType from useBots instead of a separate enum
export type BattalionType = BotType;

// CLARIFICATION: This file should only define types/interfaces/enums for the battle system.
// TODO: Ensure this file does not control logic for control state, capture progress, or any battle logic—only type definitions. Logic should be handled elsewhere.

// IMPORTANT: Shared types for battle system
// DO NOT DELETE - Used across multiple battle components
export interface BattalionPosition {
  type: BattalionType;
  nodeIndex: number;
  position: any; // Animated.ValueXY
  quantity: number;
  currentHealth?: number;
  targetNode?: number;
  mark: number;
  remainingPath?: number[]; // For path following logic
  finalTarget?: number; // For path following logic
}

// Enhanced battalion interface with bot stats integration
export interface Battalion {
  id: string;
  type: BattalionType;
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  nodeIndex: number;
  isUser: boolean;
  stats: BotStats;
  targetNode?: number;
  mark: number;
  remainingPath?: number[];
  finalTarget?: number;
}

export type BattleTarget = {
  type: 'node' | 'battalion';
  index: number;
  distance: number;
  position: { x: number; y: number };
  path?: Path;
  pathInfo?: {
    path: number[];
    nodeTransitions: number;
    pathOptions: number;
  };
};

export type BattleNode = {
  x: number;
  y: number;
  health?: number;
  captureProgress?: number;
};
