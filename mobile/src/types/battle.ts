import { Animated } from 'react-native';

export type Path = number[];

export enum BattalionType {
  GUARDIAN = 'guardian',
  PHREAK = 'phreak',
  BREACHER = 'breacher'
}

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

export type BattleTarget = {
  type: 'node' | 'battalion';
  index: number;
  distance: number;
  position: { x: number; y: number };
  path?: Path;
};

export type BattleNode = {
  x: number;
  y: number;
  controlState: 'user' | 'enemy' | 'neutral';
  health?: number;
  controlProgress?: number;
  isLocked?: boolean;
}; 