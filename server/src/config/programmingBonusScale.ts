/**
 * Tier rewards in Packet Breach / Race Condition Heist / Binary Bank Crack were tuned for
 * Mark I bases ~27 HP / ~3.5 ATK (breacher). After `bot_types` Phase 2 rescale (~3 HP / ~0.35 ATK),
 * scale aggregate programming bonuses so tier progression stays in proportion.
 *
 * Defense tier deltas are 0–1 increments; Mark I DEF bases were unchanged in Phase 2 — no scale.
 */

const STRENGTH_SCALE = 0.1; // old → new ATK ≈ ÷10
const HEALTH_SCALE = 1 / 9; // old → new HP ≈ ÷9 (breacher/phreak; guardian ~÷9.1)

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export interface ProgrammingBonusTotals {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

/** Apply after summing tier rewards from PB / RCH / BBC config. */
export function scaleProgrammingBonusTotals(totals: ProgrammingBonusTotals): ProgrammingBonusTotals {
  return {
    strength: round4(totals.strength * STRENGTH_SCALE),
    defense: totals.defense,
    speed: totals.speed,
    health: round4(totals.health * HEALTH_SCALE),
  };
}
