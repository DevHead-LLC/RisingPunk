/**
 * R1 — Battle replay capture contract (map-hack / async battles).
 * Source of truth for replay frames: the JSON body of GET /api/battle/:id/state → `data`
 * (same fields the mobile client uses for live rendering).
 *
 * R2+ recorders must call the same builder as that route (BattleResponseService + route mapping)
 * and attach `t` per frame. No seed/determinism — snapshots are authoritative.
 */

/** Schema version for stored replay documents (bump when frame or document shape changes). */
export const BATTLE_REPLAY_SCHEMA_VERSION = 1 as const;

/** One snapshot every 250ms during ACTIVE (client poll cadence); plus one at each phase transition. */
export const REPLAY_SNAPSHOT_INTERVAL_MS = 250 as const;

/** Headless / async resolution recorded space (landscape logical). */
export const REPLAY_HEADLESS_CANONICAL_WIDTH = 844 as const;
export const REPLAY_HEADLESS_CANONICAL_HEIGHT = 390 as const;

/**
 * When estimated serialized replay size exceeds this threshold, R2/R3 may drop
 * `networkConnections` and `lineProperties` from mid-battle frames only (keep on first + last).
 */
export const REPLAY_RAW_SIZE_PRUNE_THRESHOLD_BYTES = 1_000_000 as const;

// --- Wire shapes (aligned with server ClientBattalion + GET /state mapping) ---

export type BattleWireBotType = 'guardian' | 'breacher' | 'phreak';

export type BattleWireNodeOwner = 'user' | 'enemy' | 'neutral';

/** Phase strings after battle route maps server phase → client (`battle` = server active). */
export type BattleWirePhase =
  | 'setup'
  | 'countdown'
  | 'battle'
  | 'victory'
  | 'defeat'
  | 'complete';

export interface BattleWireBotStats {
  health: number;
  speed: number;
  range: number;
  offense: number;
  defense: number;
}

/**
 * Movement state as serialized on the wire (server MovementState; superset of older client types).
 */
export interface BattleWireMovementState {
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

export interface BattleWireBattalion {
  id: string;
  type: BattleWireBotType;
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  baseHealthPerUnit: number;
  isDestroyed: boolean;
  destroyedAt?: number;
  position: { x: number; y: number };
  isUser: boolean;
  mark: number;
  stats: BattleWireBotStats;
  movementState?: BattleWireMovementState;
}

export interface BattleWireNode {
  index: number;
  owner: BattleWireNodeOwner;
  tugOfWarProgress: number;
  maxCaptureThreshold: number;
  position: { x: number; y: number };
}

export interface BattleWireNetworkConnection {
  from: number;
  to: number;
}

export interface BattleWireLineProperties {
  length: number;
  angle: number;
  left: number;
  top: number;
}

export interface BattleWireBattalionLoss {
  battalionId: string;
  type: BattleWireBotType;
  mark: number;
  startingQuantity: number;
  endingQuantity: number;
  startingPoints: number;
  endingPoints: number;
  losses: number;
  owner: 'user' | 'enemy';
}

export interface BattleWireBattleLosses {
  userLosses: number;
  enemyLosses: number;
  winner: 'user' | 'enemy';
  userStartingPoints: number;
  userEndingPoints: number;
  enemyStartingPoints: number;
  enemyEndingPoints: number;
  battalionLosses: BattleWireBattalionLoss[];
  victoryMessage: string;
  endCondition: 'timer' | 'elimination';
  battleDuration: number;
}

/** `phase` reflects server battle document / timer enum values on end payloads. */
export type BattleWireBattleEndPhase =
  | 'setup'
  | 'countdown'
  | 'active'
  | 'battle'
  | 'victory'
  | 'defeat'
  | 'complete';

export interface BattleWireBattleEndData {
  battleId: string;
  winner: 'user' | 'enemy';
  losses: BattleWireBattleLosses;
  endTime: Date;
  phase: BattleWireBattleEndPhase;
  experienceGained?: number;
  hackerRewards?: number;
  levelUp?: {
    levelsGained: number;
    newLevel: number;
  };
  lifetimeHighUpdated?: boolean;
  isUserDefender?: boolean;
  isPvPBattle?: boolean;
}

export interface BattleWireVictoryCondition {
  winner: 'user' | 'enemy';
  reason: 'elimination' | 'timeout' | 'tie';
}

/**
 * Battle state as returned in GET /api/battle/:id/state → `data` (live client polling).
 * Replay snapshots reuse this shape plus {@link BattleReplaySnapshotFrame.t}.
 */
export interface BattleState {
  battleId: string;
  phase: BattleWirePhase;
  timeRemaining: number;
  winner?: 'user' | 'enemy';
  battalions: BattleWireBattalion[];
  nodes: BattleWireNode[];
  networkConnections: BattleWireNetworkConnection[];
  lineProperties: BattleWireLineProperties[];
  movementStates?: BattleWireMovementState[];
  victoryCondition?: BattleWireVictoryCondition;
  battleEndData?: BattleWireBattleEndData;
}

/**
 * Single replay frame: milliseconds since battle start (first frame t === 0)
 * plus one full wire state matching {@link BattleState}.
 */
export type BattleReplaySnapshotFrame = BattleState & {
  t: number;
};

export type BattleReplayWinner = 'user' | 'enemy';

/**
 * Persisted replay document (R3 collection). Frames are {@link BattleReplaySnapshotFrame}.
 */
export interface BattleReplayDocument {
  battleId: string;
  replayVersion: number;
  /** Recorded space width used when snapshots were produced (live client or headless). */
  canonicalScreenWidth: number;
  canonicalScreenHeight: number;
  totalDurationMs: number;
  snapshotCount: number;
  snapshots: BattleReplaySnapshotFrame[];
  createdAt: Date;
  attackerId: string;
  defenderId: string;
  isNpc: boolean;
  winner: BattleReplayWinner;
}

/** Mobile `battleApi` / UI aliases (same shapes as `BattleWire*` types). */
export type BattleEndData = BattleWireBattleEndData;
export type BattalionLoss = BattleWireBattalionLoss;
export type BattleLosses = BattleWireBattleLosses;
export type NetworkConnection = BattleWireNetworkConnection;
export type LineProperties = BattleWireLineProperties;
export type MovementState = BattleWireMovementState;

/**
 * Returns true when R2/R3 should strip network decorations from mid-battle frames per plan.
 */
export function shouldPruneReplayNetworkDecorations(estimatedJsonBytes: number): boolean {
  if (!Number.isFinite(estimatedJsonBytes)) {
    throw new Error('shouldPruneReplayNetworkDecorations: estimatedJsonBytes must be finite');
  }
  return estimatedJsonBytes > REPLAY_RAW_SIZE_PRUNE_THRESHOLD_BYTES;
}

/**
 * Drop `networkConnections` and `lineProperties` for size reduction (mid-battle only).
 * Callers must retain first/last full frames separately per R1 policy.
 */
export function stripReplayFrameNetworkDecorations(
  frame: BattleReplaySnapshotFrame
): BattleReplaySnapshotFrame {
  return {
    ...frame,
    networkConnections: [],
    lineProperties: [],
  };
}
