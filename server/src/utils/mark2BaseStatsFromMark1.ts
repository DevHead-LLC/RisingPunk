/**
 * Mark II+ base stats are derived from Mark I `bot_types` bases (single source for M1 in DB).
 * Product rules per mark step (M1→M2, M2→M3, …): HP & offense ×3; defense +0.04 (on 0–1 scale);
 * speed & range +0.5 each step.
 */
export interface BotBaseStatShape {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
}

const HP_ATK_MULT_PER_STEP = 3;
const DEFENSE_ADD_PER_STEP = 0.04;
const SPEED_RANGE_ADD_PER_STEP = 0.5;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * @param markLevel 1 = Mark I bases unchanged (rounded); 2+ = apply (markLevel − 1) derivation steps from M1.
 */
export function deriveMarkBaseStatsFromMark1(m1: BotBaseStatShape, markLevel: number): BotBaseStatShape {
  if (!Number.isInteger(markLevel) || markLevel < 1) {
    throw new Error(`Invalid markLevel: ${markLevel}`);
  }

  let cur: BotBaseStatShape = { ...m1 };

  if (markLevel === 1) {
    return {
      health: round2(cur.health),
      offense: round2(cur.offense),
      defense: round2(cur.defense),
      speed: cur.speed,
      range: cur.range,
    };
  }

  for (let step = 2; step <= markLevel; step++) {
    cur = {
      health: round2(cur.health * HP_ATK_MULT_PER_STEP),
      offense: round2(cur.offense * HP_ATK_MULT_PER_STEP),
      defense: round2(cur.defense + DEFENSE_ADD_PER_STEP),
      speed: cur.speed + SPEED_RANGE_ADD_PER_STEP,
      range: cur.range + SPEED_RANGE_ADD_PER_STEP,
    };
  }

  return cur;
}

export function deriveMark2BaseStatsFromMark1(m1: BotBaseStatShape): BotBaseStatShape {
  return deriveMarkBaseStatsFromMark1(m1, 2);
}
