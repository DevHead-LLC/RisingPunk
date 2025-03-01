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