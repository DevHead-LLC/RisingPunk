/**
 * Race Condition Heist — level config, packet/exploit types, tier params, Guardian (Cavalry) rewards.
 * Same tier/level structure as Packet Breach: 21 tiers, 5 levels per tier (1.1–21.5). See taskItems/mini-games/race-condition-heist.md.
 */

export type LevelId = string; // e.g. "1.1", "6.1"

export interface LevelParams {
  levelId: LevelId;
  tier: number;
  /** Match duration in ms. Tier 1 starts at 3 min (180000). */
  matchDurationMs: number;
  /** Words shown one at a time; last word is a "secure" word (Lock, Encrypt, Secure). Exploit when the word before it is shown. */
  wordRotation: string[];
  /** Duration in ms each word is displayed before rotating to the next. */
  wordDurationMs: number;
  /** Max packets on screen at once (Pass 1: 1). */
  maxPackets: number;
  /** Score required to complete level (claim). */
  scoreThreshold: number;
}

/**
 * Word groups for Race Condition Heist (tiers 1–3).
 * Each group is a 3-word cycle: [action, action, secureWord].
 * The last word is always a "secure" word (Lock, Encrypt, or Secure). The player must tap Exploit when the word *before* the secure word is displayed.
 * Tiers 1–3 randomly pick one of these groups per run; later tiers will use longer or harder groups.
 */
const WORD_GROUPS_TIERS_1_3: readonly string[][] = [
  ['Read', 'Write', 'Lock'],
  ['Read', 'Write', 'Encrypt'],
  ['Read', 'Write', 'Secure'],
  ['Log in', 'Fetch email', 'Lock'],
  ['Log in', 'Log out', 'Secure'],
  ['Fetch email', 'Send reply', 'Lock'],
  ['Query', 'Write', 'Encrypt'],
  ['Connect', 'Transfer', 'Secure'],
  ['Log in', 'Fetch email', 'Encrypt'],
];

/** Default word rotation for tier 4+ (until we add progressive groups). */
const WORD_ROTATION_DEFAULT = ['Read', 'Write', 'Lock'];
const WORD_DURATION_MS = 1500;

/** Return a random word group for tiers 1–3 (3-word cycle; last word = secure). For tier 4+ returns default. */
export function getRandomWordGroupForTier(tier: number): string[] {
  if (tier < 1 || tier > 3) return [...WORD_ROTATION_DEFAULT];
  const idx = Math.floor(Math.random() * WORD_GROUPS_TIERS_1_3.length);
  return [...WORD_GROUPS_TIERS_1_3[idx]];
}

/** Build all 105 levels from tier params. */
function buildAllLevels(): LevelParams[] {
  const levels: LevelParams[] = [];
  for (let tier = 1; tier <= 21; tier++) {
    const matchDurationMs = tier === 1 ? 180000 : Math.max(90000, 180000 - (tier - 1) * 2000);
    const wordRotation = WORD_ROTATION_DEFAULT;
    const wordDurationMs = WORD_DURATION_MS;
    const maxPackets = tier <= 3 ? 1 : tier <= 8 ? 2 : Math.min(5, Math.floor(tier / 3) + 1);
    /** Tier 1: 50 (one). Tier 2: 100 (two nodes). Tier 3: 150 (three nodes). Tier 4+: 50 for now. */
    const scoreThreshold = tier === 1 ? 50 : tier === 2 ? 100 : tier === 3 ? 150 : 50;
    for (let y = 1; y <= 5; y++) {
      levels.push({
        levelId: `${tier}.${y}`,
        tier,
        matchDurationMs,
        wordRotation,
        wordDurationMs,
        maxPackets,
        scoreThreshold,
      });
    }
  }
  return levels;
}

const ALL_LEVELS = buildAllLevels();
const LEVEL_MAP = new Map<LevelId, LevelParams>(ALL_LEVELS.map((l) => [l.levelId, l]));

export function getLevelParams(levelId: LevelId): LevelParams | null {
  return LEVEL_MAP.get(levelId) ?? null;
}

/** Cost per run: same formula as Packet Breach — ((X-1)*5 + Y) * 100. */
export function getCostForLevel(levelId: LevelId): number {
  const match = /^(\d+)\.(\d+)$/.exec(levelId);
  if (!match) return 0;
  const X = parseInt(match[1], 10);
  const Y = parseInt(match[2], 10);
  return ((X - 1) * 5 + Y) * 100;
}

export function getTierLevels(tier: number): LevelId[] {
  return ALL_LEVELS.filter((l) => l.tier === tier).map((l) => l.levelId);
}

/** All level IDs in unlock order (1.1–21.5). */
export function getAllLevelIds(): LevelId[] {
  return ALL_LEVELS.map((l) => l.levelId);
}

/** Packet types and point values (design doc). */
export const PACKET_TYPES = {
  USER_DATA: 50,
  ACCESS_TOKEN: 100,
  API_KEYS: 200,
  ADMIN_TOKEN: 400,
  ROOT_CREDENTIALS: 800,
} as const;

export type PacketTypeKey = keyof typeof PACKET_TYPES;

/** Exploit types: cooldown ms and reward multiplier. Pass 1 uses BUFFER_OVERFLOW only. */
export const EXPLOIT_TYPES = {
  BUFFER_OVERFLOW: { cooldownMs: 800, multiplier: 1 },
  SESSION_HIJACK: { cooldownMs: 1500, multiplier: 1.25 },
  PRIVILEGE_ESCALATION: { cooldownMs: 2500, multiplier: 2 },
} as const;

export type ExploitKey = keyof typeof EXPLOIT_TYPES;

/** Combo thresholds: 2 packets = 1.2x, 4 = 1.5x, 6 = 2x (design doc). */
export const COMBO_MULTIPLIERS: { count: number; multiplier: number }[] = [
  { count: 2, multiplier: 1.2 },
  { count: 4, multiplier: 1.5 },
  { count: 6, multiplier: 2 },
];

export function getComboMultiplier(comboCount: number): number {
  let mult = 1;
  for (const { count, multiplier } of COMBO_MULTIPLIERS) {
    if (comboCount >= count) mult = multiplier;
  }
  return mult;
}

/** Guardian (Cavalry) tier rewards — same shape as armyBonus; applied to guardian only. */
export interface GuardianBonusDelta {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

const RCH_TIER_REWARDS: GuardianBonusDelta[] = [
  { strength: 0.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 1 },
  { strength: 0, defense: 0.001, speed: 0, health: 0 },
  { strength: 1, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 2 },
  { strength: 0, defense: 0.003, speed: 0, health: 0 },
  { strength: 1.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 3 },
  { strength: 0, defense: 0.005, speed: 0, health: 0 },
  { strength: 2, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 4 },
  { strength: 0, defense: 0.007, speed: 0, health: 0 },
  { strength: 2.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 5 },
  { strength: 0, defense: 0.009, speed: 0, health: 0 },
  { strength: 3, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 6 },
  { strength: 0, defense: 0.011, speed: 0, health: 0 },
  { strength: 3.5, defense: 0, speed: 0, health: 0 },
  { strength: 0, defense: 0, speed: 0, health: 7 },
  { strength: 0, defense: 0.013, speed: 0, health: 0 },
];

/**
 * Compute Race Condition Heist contribution to guardianBonus from levelsCompleted.
 * Used for Cavalry (Guardian) only.
 */
export function computeRaceConditionHeistGuardianBonus(levelsCompleted: string[]): GuardianBonusDelta {
  const set = new Set(levelsCompleted);
  let strength = 0;
  let defense = 0;
  let speed = 0;
  let health = 0;
  for (let tier = 1; tier <= RCH_TIER_REWARDS.length; tier++) {
    const required = getTierLevels(tier);
    if (required.length > 0 && required.every((id) => set.has(id))) {
      const r = RCH_TIER_REWARDS[tier - 1];
      strength += r.strength;
      defense += r.defense;
      speed += r.speed;
      health += r.health;
    }
  }
  return { strength, defense, speed, health };
}
