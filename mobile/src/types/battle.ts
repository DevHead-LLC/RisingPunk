import { Animated } from 'react-native';

export enum BattalionType {
  GUARDIAN = 'guardian',
  PHREAK = 'phreak',
  BREACHER = 'breacher'
}

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
}

export type BattleTarget = {
  type: 'node' | 'battalion';
  index: number;
  distance: number;
  position: { x: number; y: number };
};

export type BattleNode = {
  x: number;
  y: number;
  controlState: 'user' | 'enemy' | 'neutral';
  health?: number;
  controlProgress?: number;
  isLocked?: boolean;
}; 