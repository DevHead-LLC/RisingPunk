// Implementation of @battle-core-mechanics.mdc#Combat-Logic#Battalion-Stats
// Core types for the battalion stats system

export enum BattalionType {
  Guardian = 'Guardian',
  Phreak = 'Phreak',
  Breacher = 'Breacher'
}

export interface BattalionStats {
  // Fixed stats as defined in @battle-core-mechanics.mdc
  speed: number;    // Movement speed (unchanged by quantity)
  range: number;    // Attack range (unchanged by quantity)
  offense: number;  // Base offense for attack calculations
  defense: number;  // Base defense (as % damage reduction)
  health: number;   // Base health per unit

  // Scaled stats (optional as they depend on quantity)
  totalHealth?: number;  // base_health * quantity
  totalAttack?: number;  // base_offense * quantity
}

// Combat calculation parameters as defined in @battle-core-mechanics.mdc#Combat-Logic
export interface CombatCalculationParams {
  attackerType: BattalionType;
  attackerQuantity: number;
  defenderType: BattalionType;
  defenderQuantity: number;
}

// Position type for targeting calculations
export interface Position {
  x: number;
  y: number;
}

// Target information for targeting calculations
export interface TargetInfo {
  type: BattalionType;
  position: Position;
}

// Parameters for targeting priority calculation
export interface TargetingParams {
  attackerPosition: Position;
  targets: TargetInfo[];
}

// Result of targeting priority calculation
export interface TargetingResult {
  selectedTarget: TargetInfo;
}

// Parameters for attack position calculation
export interface AttackPositionParams {
  attackerType: BattalionType;
  attackerPosition: Position;
  targetPosition: Position;
}

// Node ownership types
export enum NodeOwnership {
  User = 'User',
  Neutral = 'Neutral',
  Enemy = 'Enemy'
}

// Node information
export interface NodeInfo {
  position: Position;
  ownership: NodeOwnership;
} 