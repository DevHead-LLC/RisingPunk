import type {
  BattleWireBattalion,
  BattleWireLineProperties,
  BattleWireMovementState,
  BattleWireNetworkConnection,
} from '../../../shared/battleReplay';

export type NodePosition = { x: number; y: number };

export enum BattalionType {
  GUARDIAN = 'guardian',
  PHREAK = 'phreak',
  BREACHER = 'breacher',
}

export enum NodeOwner {
  USER = 'user',
  ENEMY = 'enemy',
  NEUTRAL = 'neutral',
}

export type ClientBattalion = BattleWireBattalion;

export enum BattlePhase {
  COUNTDOWN = 'countdown',
  ACTIVE = 'active',
  COMPLETE = 'complete',
}

export type NetworkConnection = BattleWireNetworkConnection;
export type LineProperties = BattleWireLineProperties;
export type MovementState = BattleWireMovementState;
