import { Animated } from 'react-native';

// IMPORTANT: Shared types for battle system
// DO NOT DELETE - Used across multiple battle components
export type BattalionPosition = {
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  nodeIndex: number;
  position: Animated.ValueXY;
};

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