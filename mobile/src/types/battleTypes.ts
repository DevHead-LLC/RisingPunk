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

// PHASE 1 & 5 EXTENSION: Client-side battalion interface for type safety and health display
// This matches the server's ClientBattalion interface to ensure proper typing
// of battalion data received from the server, including health management properties
export interface ClientBattalion {
  id: string;
  type: 'guardian' | 'breacher' | 'phreak';
  quantity: number;                         // PHASE 1: Updates dynamically with health damage
  currentHealth: number;                    // PHASE 1: Current health total (decreases with damage)
  maxHealth: number;                        // Maximum health when at full strength
  
  // PHASE 1: Battalion combat properties for health management and destruction
  baseHealthPerUnit: number;                // Original health per unit for calculations
  isDestroyed: boolean;                     // Whether battalion has been eliminated
  destroyedAt?: number;                     // Timestamp when destroyed (optional)
  
  nodeIndex: number;
  isUser: boolean;
  mark: number;
  stats: {
    health: number;
    speed: number;
    range: number;
    offense: number;
    defense: number;
  };
  movementState?: MovementState;
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
  // PHASE 1: Enhanced properties for movement type distinction and interruption
  movementType?: 'initial' | 'retargeting';        // NEW - prevents logic mixing
  fullPath?: number[];                             // NEW - complete multi-node path [0,3,1,4]
  currentPathIndex?: number;                       // NEW - current position in fullPath (0=start)
  finalTarget?: number;                            // NEW - ultimate destination node
  isInterruptible?: boolean;                       // NEW - can be stopped for retargeting
}
