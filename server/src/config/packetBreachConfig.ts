/**
 * Packet Breach — level config (parameters only; no preset puzzles).
 * Tiers 1–21 (1.1–21.5). Tier 7+: 4-node pool + Decoy; Tier 13+: 5-node pool + Decoy. See taskItems/mini-games/packet-breach-levels.md.
 */

export type LevelId = string; // e.g. "1.1", "6.1"

export interface LevelParams {
  levelId: LevelId;
  tier: number;
  nodeTypes: number;
  slots: number;
  attempts: number;
}

const TIER_1_LEVELS: LevelParams[] = [
  { levelId: '1.1', tier: 1, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '1.2', tier: 1, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '1.3', tier: 1, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '1.4', tier: 1, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '1.5', tier: 1, nodeTypes: 3, slots: 3, attempts: 10 },
];

const TIER_2_LEVELS: LevelParams[] = [
  { levelId: '2.1', tier: 2, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '2.2', tier: 2, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '2.3', tier: 2, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '2.4', tier: 2, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '2.5', tier: 2, nodeTypes: 3, slots: 3, attempts: 10 },
];

const TIER_3_LEVELS: LevelParams[] = [
  { levelId: '3.1', tier: 3, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '3.2', tier: 3, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '3.3', tier: 3, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '3.4', tier: 3, nodeTypes: 3, slots: 3, attempts: 10 },
  { levelId: '3.5', tier: 3, nodeTypes: 3, slots: 3, attempts: 10 },
];

const TIER_4_LEVELS: LevelParams[] = [
  { levelId: '4.1', tier: 4, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '4.2', tier: 4, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '4.3', tier: 4, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '4.4', tier: 4, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '4.5', tier: 4, nodeTypes: 3, slots: 3, attempts: 9 },
];

const TIER_5_LEVELS: LevelParams[] = [
  { levelId: '5.1', tier: 5, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '5.2', tier: 5, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '5.3', tier: 5, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '5.4', tier: 5, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '5.5', tier: 5, nodeTypes: 3, slots: 3, attempts: 9 },
];

const TIER_6_LEVELS: LevelParams[] = [
  { levelId: '6.1', tier: 6, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '6.2', tier: 6, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '6.3', tier: 6, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '6.4', tier: 6, nodeTypes: 3, slots: 3, attempts: 9 },
  { levelId: '6.5', tier: 6, nodeTypes: 3, slots: 3, attempts: 9 },
];

const TIER_7_LEVELS: LevelParams[] = [
  { levelId: '7.1', tier: 7, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '7.2', tier: 7, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '7.3', tier: 7, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '7.4', tier: 7, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '7.5', tier: 7, nodeTypes: 4, slots: 3, attempts: 10 },
];

const TIER_8_LEVELS: LevelParams[] = [
  { levelId: '8.1', tier: 8, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '8.2', tier: 8, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '8.3', tier: 8, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '8.4', tier: 8, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '8.5', tier: 8, nodeTypes: 4, slots: 3, attempts: 10 },
];

const TIER_9_LEVELS: LevelParams[] = [
  { levelId: '9.1', tier: 9, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '9.2', tier: 9, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '9.3', tier: 9, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '9.4', tier: 9, nodeTypes: 4, slots: 3, attempts: 10 },
  { levelId: '9.5', tier: 9, nodeTypes: 4, slots: 3, attempts: 10 },
];

const TIER_10_LEVELS: LevelParams[] = [
  { levelId: '10.1', tier: 10, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '10.2', tier: 10, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '10.3', tier: 10, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '10.4', tier: 10, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '10.5', tier: 10, nodeTypes: 4, slots: 3, attempts: 9 },
];

const TIER_11_LEVELS: LevelParams[] = [
  { levelId: '11.1', tier: 11, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '11.2', tier: 11, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '11.3', tier: 11, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '11.4', tier: 11, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '11.5', tier: 11, nodeTypes: 4, slots: 3, attempts: 9 },
];

const TIER_12_LEVELS: LevelParams[] = [
  { levelId: '12.1', tier: 12, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '12.2', tier: 12, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '12.3', tier: 12, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '12.4', tier: 12, nodeTypes: 4, slots: 3, attempts: 9 },
  { levelId: '12.5', tier: 12, nodeTypes: 4, slots: 3, attempts: 9 },
];

const TIER_13_LEVELS: LevelParams[] = [
  { levelId: '13.1', tier: 13, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '13.2', tier: 13, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '13.3', tier: 13, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '13.4', tier: 13, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '13.5', tier: 13, nodeTypes: 5, slots: 3, attempts: 10 },
];

const TIER_14_LEVELS: LevelParams[] = [
  { levelId: '14.1', tier: 14, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '14.2', tier: 14, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '14.3', tier: 14, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '14.4', tier: 14, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '14.5', tier: 14, nodeTypes: 5, slots: 3, attempts: 10 },
];

const TIER_15_LEVELS: LevelParams[] = [
  { levelId: '15.1', tier: 15, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '15.2', tier: 15, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '15.3', tier: 15, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '15.4', tier: 15, nodeTypes: 5, slots: 3, attempts: 10 },
  { levelId: '15.5', tier: 15, nodeTypes: 5, slots: 3, attempts: 10 },
];

const TIER_16_LEVELS: LevelParams[] = [
  { levelId: '16.1', tier: 16, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '16.2', tier: 16, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '16.3', tier: 16, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '16.4', tier: 16, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '16.5', tier: 16, nodeTypes: 5, slots: 3, attempts: 9 },
];

const TIER_17_LEVELS: LevelParams[] = [
  { levelId: '17.1', tier: 17, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '17.2', tier: 17, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '17.3', tier: 17, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '17.4', tier: 17, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '17.5', tier: 17, nodeTypes: 5, slots: 3, attempts: 9 },
];

const TIER_18_LEVELS: LevelParams[] = [
  { levelId: '18.1', tier: 18, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '18.2', tier: 18, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '18.3', tier: 18, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '18.4', tier: 18, nodeTypes: 5, slots: 3, attempts: 9 },
  { levelId: '18.5', tier: 18, nodeTypes: 5, slots: 3, attempts: 9 },
];

const TIER_19_LEVELS: LevelParams[] = [
  { levelId: '19.1', tier: 19, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '19.2', tier: 19, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '19.3', tier: 19, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '19.4', tier: 19, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '19.5', tier: 19, nodeTypes: 5, slots: 3, attempts: 8 },
];

const TIER_20_LEVELS: LevelParams[] = [
  { levelId: '20.1', tier: 20, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '20.2', tier: 20, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '20.3', tier: 20, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '20.4', tier: 20, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '20.5', tier: 20, nodeTypes: 5, slots: 3, attempts: 8 },
];

const TIER_21_LEVELS: LevelParams[] = [
  { levelId: '21.1', tier: 21, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '21.2', tier: 21, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '21.3', tier: 21, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '21.4', tier: 21, nodeTypes: 5, slots: 3, attempts: 8 },
  { levelId: '21.5', tier: 21, nodeTypes: 5, slots: 3, attempts: 8 },
];

const ALL_LEVELS: LevelParams[] = [
  ...TIER_1_LEVELS,
  ...TIER_2_LEVELS,
  ...TIER_3_LEVELS,
  ...TIER_4_LEVELS,
  ...TIER_5_LEVELS,
  ...TIER_6_LEVELS,
  ...TIER_7_LEVELS,
  ...TIER_8_LEVELS,
  ...TIER_9_LEVELS,
  ...TIER_10_LEVELS,
  ...TIER_11_LEVELS,
  ...TIER_12_LEVELS,
  ...TIER_13_LEVELS,
  ...TIER_14_LEVELS,
  ...TIER_15_LEVELS,
  ...TIER_16_LEVELS,
  ...TIER_17_LEVELS,
  ...TIER_18_LEVELS,
  ...TIER_19_LEVELS,
  ...TIER_20_LEVELS,
  ...TIER_21_LEVELS,
];

const LEVEL_MAP = new Map<LevelId, LevelParams>(
  ALL_LEVELS.map((l) => [l.levelId, l])
);

export function getLevelParams(levelId: LevelId): LevelParams | null {
  return LEVEL_MAP.get(levelId) ?? null;
}

/** Cost per attempt for level X.Y: ((X-1)*5 + Y) * 100. E.g. 1.1 = 100, 1.5 = 500, 20.5 = 10000. */
export function getCostForLevel(levelId: LevelId): number {
  const match = /^(\d+)\.(\d+)$/.exec(levelId);
  if (!match) return 0;
  const X = parseInt(match[1], 10);
  const Y = parseInt(match[2], 10);
  return ((X - 1) * 5 + Y) * 100;
}

/** All level IDs in unlock order (1.1–1.5, 2.1–2.5, …). */
export function getLevelIdsForPhase1(): LevelId[] {
  return ALL_LEVELS.map((l) => l.levelId);
}

export function getTierLevels(tier: number): LevelId[] {
  return ALL_LEVELS.filter((l) => l.tier === tier).map((l) => l.levelId);
}

/** Protocol labels for node pool (Stage 1 uses first nodeTypes). Tier 13+ uses 5. */
export const PROTOCOLS = ['TCP', 'UDP', 'SSH', 'HTTP', 'HTTPS'] as const;

/** Infantry (breacher) tier rewards: complete all 5 levels in a tier to unlock. Attack→strength, Health→health, Defense→defense. */
export interface ArmyBonusDelta {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

// Tier rewards from level design: Attack / Health / Defense cycle. Defense in decimal (0.001 = 0.1%, 0.007 = 0.70%).
const TIER_REWARDS: ArmyBonusDelta[] = [
  { strength: 0.5, defense: 0, speed: 0, health: 0 },   // Tier 1: Attack +0.5
  { strength: 0, defense: 0, speed: 0, health: 1 },     // Tier 2: Health +1
  { strength: 0, defense: 0.001, speed: 0, health: 0 }, // Tier 3: Defense +0.10%
  { strength: 1, defense: 0, speed: 0, health: 0 },     // Tier 4: Attack +1
  { strength: 0, defense: 0, speed: 0, health: 2 },    // Tier 5: Health +2
  { strength: 0, defense: 0.003, speed: 0, health: 0 }, // Tier 6: Defense +0.30%
  { strength: 1.5, defense: 0, speed: 0, health: 0 },   // Tier 7: Attack +1.5
  { strength: 0, defense: 0, speed: 0, health: 3 },     // Tier 8: Health +3
  { strength: 0, defense: 0.005, speed: 0, health: 0 }, // Tier 9: Defense +0.50%
  { strength: 2, defense: 0, speed: 0, health: 0 },     // Tier 10: Attack +2
  { strength: 0, defense: 0, speed: 0, health: 4 },    // Tier 11: Health +4
  { strength: 0, defense: 0.007, speed: 0, health: 0 }, // Tier 12: Defense +0.70%
  { strength: 2.5, defense: 0, speed: 0, health: 0 },   // Tier 13: Attack +2.5
  { strength: 0, defense: 0, speed: 0, health: 5 },    // Tier 14: Health +5
  { strength: 0, defense: 0.009, speed: 0, health: 0 }, // Tier 15: Defense +0.90%
  { strength: 3, defense: 0, speed: 0, health: 0 },     // Tier 16: Attack +3
  { strength: 0, defense: 0, speed: 0, health: 6 },     // Tier 17: Health +6
  { strength: 0, defense: 0.011, speed: 0, health: 0 }, // Tier 18: Defense +1.10%
  { strength: 3.5, defense: 0, speed: 0, health: 0 },   // Tier 19: Attack +3.5
  { strength: 0, defense: 0, speed: 0, health: 7 },       // Tier 20: Health +7
  { strength: 0, defense: 0.013, speed: 0, health: 0 }, // Tier 21: Defense +1.30%
];

/**
 * Compute Packet Breach contribution to armyBonus from levelsCompleted.
 * Single source of truth: only completed tiers (all 5 levels) grant rewards.
 * Accumulates rewards for every completed tier (1–9 and beyond if TIER_REWARDS is extended).
 * Used for infantry (breacher) only; future Mark II can use same bonus or separate field.
 */
export function computePacketBreachArmyBonus(levelsCompleted: string[]): ArmyBonusDelta {
  const set = new Set(levelsCompleted);
  let strength = 0;
  let defense = 0;
  let speed = 0;
  let health = 0;
  for (let tier = 1; tier <= TIER_REWARDS.length; tier++) {
    const required = getTierLevels(tier);
    if (required.length > 0 && required.every((id) => set.has(id))) {
      const r = TIER_REWARDS[tier - 1];
      strength += r.strength;
      defense += r.defense;
      speed += r.speed;
      health += r.health;
    }
  }
  return { strength, defense, speed, health };
}
