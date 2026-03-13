/**
 * Binary Bank Crack — level config for Tiers 1–21 (5 levels per tier).
 * Per-tier: accidental flips, time limit, combinations (register count), binary bit (register size).
 * Flip limit per session: min flips for the combination + tier accidental flips.
 * See taskItems/mini-games/binary-bank-crack.md.
 */

export type LevelId = string; // e.g. "1.1", "21.5"

export interface LevelParams {
  levelId: LevelId;
  tier: number;
  /** Bits per register (4, 6, 8, 10, 12, 14, 16). */
  registerSize: number;
  /** Number of combinations (registers) to solve. */
  registerCount: number;
  /** Accidental/mistake flips allowed on top of minimum needed. */
  accidentalFlips: number;
  /** Display/legacy; actual limit is computeFlipLimitForVault(vaultTargets, registerSize, accidentalFlips). */
  flipLimit: number;
  timeLimitSeconds: number;
  showDecimalAssist: boolean;
}

/** Tier 1–21 rules: Accidental Flips, Time Seconds, Combinations, Binary Bit. */
const TIER_RULES: Array<{ accidentalFlips: number; timeSeconds: number; combinations: number; binaryBit: number }> = [
  { accidentalFlips: 3, timeSeconds: 30, combinations: 3, binaryBit: 4 },   // 1
  { accidentalFlips: 3, timeSeconds: 30, combinations: 4, binaryBit: 4 },   // 2
  { accidentalFlips: 3, timeSeconds: 30, combinations: 5, binaryBit: 4 },   // 3
  { accidentalFlips: 2, timeSeconds: 30, combinations: 3, binaryBit: 6 },   // 4
  { accidentalFlips: 2, timeSeconds: 30, combinations: 4, binaryBit: 6 },   // 5
  { accidentalFlips: 2, timeSeconds: 30, combinations: 5, binaryBit: 6 },   // 6
  { accidentalFlips: 1, timeSeconds: 30, combinations: 3, binaryBit: 8 },   // 7
  { accidentalFlips: 1, timeSeconds: 30, combinations: 4, binaryBit: 8 },   // 8
  { accidentalFlips: 1, timeSeconds: 30, combinations: 5, binaryBit: 8 },   // 9
  { accidentalFlips: 0, timeSeconds: 30, combinations: 3, binaryBit: 10 },  // 10
  { accidentalFlips: 0, timeSeconds: 30, combinations: 4, binaryBit: 10 },  // 11
  { accidentalFlips: 0, timeSeconds: 30, combinations: 5, binaryBit: 10 },  // 12
  { accidentalFlips: 0, timeSeconds: 30, combinations: 6, binaryBit: 12 },  // 13
  { accidentalFlips: 0, timeSeconds: 30, combinations: 7, binaryBit: 12 },  // 14
  { accidentalFlips: 0, timeSeconds: 30, combinations: 8, binaryBit: 12 },  // 15
  { accidentalFlips: 0, timeSeconds: 35, combinations: 8, binaryBit: 14 },  // 16
  { accidentalFlips: 0, timeSeconds: 35, combinations: 9, binaryBit: 14 },  // 17
  { accidentalFlips: 0, timeSeconds: 35, combinations: 9, binaryBit: 14 },  // 18
  { accidentalFlips: 0, timeSeconds: 40, combinations: 10, binaryBit: 16 }, // 19
  { accidentalFlips: 0, timeSeconds: 40, combinations: 10, binaryBit: 16 }, // 20
  { accidentalFlips: 0, timeSeconds: 40, combinations: 11, binaryBit: 16 }, // 21
];

function buildAllLevels(): LevelParams[] {
  const out: LevelParams[] = [];
  for (let tier = 1; tier <= 21; tier++) {
    const rule = TIER_RULES[tier - 1];
    if (!rule) continue;
    for (let sub = 1; sub <= 5; sub++) {
      const levelId = `${tier}.${sub}` as LevelId;
      out.push({
        levelId,
        tier,
        registerSize: rule.binaryBit,
        registerCount: rule.combinations,
        accidentalFlips: rule.accidentalFlips,
        flipLimit: 10, // legacy display; actual from computeFlipLimitForVault
        timeLimitSeconds: rule.timeSeconds,
        showDecimalAssist: true,
      });
    }
  }
  return out;
}

const ALL_LEVELS: LevelParams[] = buildAllLevels();

export function getLevelParams(levelId: LevelId): LevelParams | null {
  return ALL_LEVELS.find((l) => l.levelId === levelId) ?? null;
}

/** All level IDs in progression order (1.1 … 21.5). */
export function getAllLevelIds(): LevelId[] {
  return ALL_LEVELS.map((l) => l.levelId);
}

/** Cost per level: linear by position. (tier-1)*5 + sub → * 100. */
export function getCostForLevel(levelId: LevelId): number {
  const match = /^(\d+)\.(\d+)$/.exec(levelId);
  if (!match) return 0;
  const tier = parseInt(match[1], 10);
  const sub = parseInt(match[2], 10);
  return ((tier - 1) * 5 + sub) * 100;
}

export function getLevelIdsForTier1(): LevelId[] {
  return getTierLevels(1);
}

export function getTierLevels(tier: number): LevelId[] {
  return ALL_LEVELS.filter((l) => l.tier === tier).map((l) => l.levelId);
}

/** Tier rewards for the Range bot type (Phreaks). Same stats as other games: Attack, Health, Defense, Speed — not "attack range". */
export interface PhreakBonusDelta {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

/** Same tier reward values as packetBreachConfig and raceConditionHeistConfig. Tier 1 = Attack +0.5, Tier 2 = Health +1, Tier 3 = Defense +0.10%, etc. */
const BBC_TIER_REWARDS: PhreakBonusDelta[] = [
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
 * Compute Binary Bank Crack contribution to phreakBonus from levelsCompleted.
 * Same logic as PB (Infantry) and RCH (Cavalry): improves Attack/Health/Defense/Speed for the Range bot type (Phreaks).
 */
export function computeBinaryBankCrackPhreakBonus(levelsCompleted: string[]): PhreakBonusDelta {
  const set = new Set(levelsCompleted);
  let strength = 0;
  let defense = 0;
  let speed = 0;
  let health = 0;
  for (let tier = 1; tier <= BBC_TIER_REWARDS.length; tier++) {
    const required = getTierLevels(tier);
    if (required.length > 0 && required.every((id) => set.has(id))) {
      const r = BBC_TIER_REWARDS[tier - 1];
      strength += r.strength;
      defense += r.defense;
      speed += r.speed;
      health += r.health;
    }
  }
  return { strength, defense, speed, health };
}

/** Max value for an N-bit register (0 to 2^N - 1). */
function maxValueForBits(bits: number): number {
  if (bits <= 0 || bits > 24) return 0;
  return (1 << bits) - 1;
}

/** Generate random decimal targets for each register; each value in [0, 2^registerSize - 1]. */
export function generateVaultTargets(registerCount: number, registerSize: number): number[] {
  const max = maxValueForBits(registerSize);
  if (max <= 0) return [];
  const out: number[] = [];
  for (let i = 0; i < registerCount; i++) {
    out.push(Math.floor(Math.random() * (max + 1)));
  }
  return out;
}

/** Number of 1-bits in value n (for up to 24-bit). */
export function popcountN(n: number, bits: number): number {
  if (bits <= 0 || n < 0) return 0;
  const max = maxValueForBits(bits);
  if (n > max) return 0;
  let count = 0;
  for (let i = 0; i < bits; i++) {
    if ((n >> i) & 1) count++;
  }
  return count;
}

/** 4-bit popcount (for backward compat). */
export function popcount4(n: number): number {
  return popcountN(n, 4);
}

/** Bonus flips for Tier 1 (legacy); use level params.accidentalFlips for others. */
export const BONUS_FLIPS = 3;

/**
 * Compute flip limit for a vault: min flips to solve (sum of popcounts) + accidental flips.
 */
export function computeFlipLimitForVault(
  vaultTargets: number[],
  registerSize: number,
  accidentalFlips: number
): number {
  const minFlips = vaultTargets.reduce((sum, t) => sum + popcountN(t, registerSize), 0);
  return minFlips + accidentalFlips;
}
