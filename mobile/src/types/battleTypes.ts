export type NodePosition = { x: number; y: number };

export enum BattalionType {
  GUARDIAN = 'guardian',
  PHREAK = 'phreak',
  BREACHER = 'breacher'
}

export interface ClientBattalion {
  id: string;
  type: 'guardian' | 'breacher' | 'phreak';
  quantity: number;
  currentHealth: number;
  maxHealth: number;
  baseHealthPerUnit: number;
  isDestroyed: boolean;
  destroyedAt?: number;
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

export enum BattlePhase {
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETE = 'complete'
}

export interface NetworkConnection {
  from: number;
  to: number;
}

export interface LineProperties {
  length: number;
  angle: number;
  left: number;
  top: number;
}

export interface MovementState {
  battalionId: string;
  startPosition: { x: number; y: number; nodeIndex: number };
  targetPosition: { x: number; y: number; nodeIndex: number };
  movementStatus: 'stationary' | 'moving' | 'arrived';
  startTime: number;
  estimatedDuration: number;
  networkPath: number[];
  attackRangePosition?: { x: number; y: number };
  isWithinAttackRange: boolean;
  movementType?: 'initial' | 'retargeting';
  fullPath?: number[];
  currentPathIndex?: number;
  finalTarget?: number;
  isInterruptible?: boolean;
  wasInterrupted?: boolean;
  interruptionPosition?: { x: number; y: number; nodeIndex: number };
}
