import { Document } from 'mongoose';
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
  movementType?: 'initial' | 'retargeting' | 'interrupted_recovery';        // NEW - prevents logic mixing, added recovery type
  fullPath?: number[];                             // NEW - complete multi-node path [0,3,1,4]
  currentPathIndex?: number;                       // NEW - current position in fullPath (0=start)
  finalTarget?: number;                            // NEW - ultimate destination node
  isInterruptible?: boolean;                       // NEW - can be stopped for retargeting
  // MOVEMENT INTERRUPTION FIX: Properties for handling interrupted movements
  wasInterrupted?: boolean;                        // NEW - marks movement as interrupted
  interruptionPosition?: { x: number; y: number; nodeIndex: number }; // NEW - exact position when interrupted
  // RECOVERY MOVEMENT: Properties for handling movement to nearest node after interruption  
  needsRetargetingOnArrival?: boolean;             // NEW - triggers retargeting when reaching nearest node
  originalInterruptionPosition?: { x: number; y: number; nodeIndex: number }; // FIXED: Preserve original interruption data for retargeting
}

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
// PHASE 1 EXTENSION: Added properties for battalion combat system
export interface IBattalion {
  id: string;
  type: BotType;
  quantity: number;
  currentHealth: number;  // Already exists - running health total
  maxHealth: number;      // Already exists - maximum health when at full strength
  
  // NEW PHASE 1 PROPERTIES for battalion combat:
  baseHealthPerUnit: number;  // Original health per unit for unit count calculations
                             // Used in Math.round(currentHealth / baseHealthPerUnit) formula
                             // Example: 100 health per unit enables precise unit reduction tracking
  
  isDestroyed: boolean;      // Whether battalion has been eliminated in combat
                            // When true: cannot be targeted, attacked, or receive damage
                            // Triggers retargeting for any battalions targeting this one
  
  destroyedAt?: number;     // Timestamp when battalion was destroyed (optional)
                           // Used for cleanup operations and destruction animations
                           // Only set when isDestroyed becomes true
  
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
// PHASE 2 EXTENSION: Added targetType for battalion vs node attack distinction
// PHASE 4 EXTENSION: Added targetBattalionId for specific battalion targeting
export interface BattalionTargetingResult {
  battalionId: string;
  battalionType: BotType;
  battalionOwner: NodeOwner;
  startingNode: number;
  targetNode: number;
  isValidTarget: boolean;
  reason?: string;
  
  // PHASE 2 PROPERTY for attack target determination:
  targetType?: 'neutral_node' | 'enemy_battalion';  // What type of target this battalion should attack
                                                    // Used in MovementService to determine attack behavior on arrival
                                                    // Flows from RetargetingService through BattalionService storage
  
  // NEW PHASE 4 PROPERTY for specific battalion targeting:
  targetBattalionId?: string;                       // When targetType is 'enemy_battalion', this specifies which battalion
                                                    // Used to identify the exact enemy battalion to attack at the target node
                                                    // Prevents confusion when multiple enemy battalions are at the same node
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
// PHASE 1 EXTENSION: Added properties for battalion combat system
export interface ClientBattalion {
  id: string;
  type: BotType;
  quantity: number;
  currentHealth: number;  // Already exists - running health total
  maxHealth: number;      // Already exists - maximum health when at full strength
  
  // NEW PHASE 1 PROPERTIES for battalion combat (matching IBattalion):
  baseHealthPerUnit: number;  // Original health per unit for unit count calculations
  isDestroyed: boolean;      // Whether battalion has been eliminated in combat
  destroyedAt?: number;     // Timestamp when battalion was destroyed (optional)
  
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
  retargetingStatus?: {nodeIndex: number, affectedBattalionIds: string[]}; // Phase 3: Retargeting data
  lastUpdated: Date;
} 

// RETARGETING QUEUE: Task management for sequential retargeting operations
export interface RetargetingQueueTask {
  trigger: string;                                      // Human-readable description of what caused this retargeting
  triggerType: 'node_capture' | 'battalion_destruction' | 'interrupted_recovery' | 'missing_target'; // NEW - type of retargeting event
  battleId: string;                                     // Which battle this affects  
  timestamp: number;                                    // When this was queued
  
  // NODE CAPTURE specific fields:
  capturedNodeIndex?: number;                           // Which node was captured
  affectedBattalionIds?: string[];                      // Battalions that need retargeting
  
  // BATTALION DESTRUCTION specific fields:
  destroyedBattalionId?: string;                        // Which battalion was destroyed
  // affectedBattalionIds also used here                // Battalions that were targeting the destroyed one
  
  // INTERRUPTED RECOVERY specific fields:
  battalionId?: string;                                 // NEW - battalion that completed recovery movement
  
  // MISSING TARGET specific fields:
  // battalionId also used here                         // NEW - battalion that couldn't find its target on arrival
} 