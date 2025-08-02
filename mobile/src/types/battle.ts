// All types moved to battleTypes.ts (single source of truth)

import { BattalionType } from './battleTypes';

// BattalionType moved to battleTypes.ts (single source of truth)

// CLARIFICATION: This file should only define types/interfaces/enums for the battle system.
// TODO: Ensure this file does not control logic for control state, capture progress, or any battle logic—only type definitions. Logic should be handled elsewhere.

// IMPORTANT: Shared types for battle system
// DO NOT DELETE - Used across multiple battle components
export interface BattalionPosition {
  type: BattalionType;
  position: { x: number; y: number };
  quantity: number;
  currentHealth?: number;
  mark: number;
}

// Battalion interface moved to battleTypes.ts (single source of truth)

// BattleNode interface moved to battleTypes.ts (single source of truth)
