/**
 * Shared tier config and helpers for Programming Facility level screens:
 * Packet Breach, Race Condition Heist, Binary Bank Crack.
 *
 * Reward labels must match what the server applies after `scaleProgrammingBonusTotals`
 * (see server/src/config/programmingBonusScale.ts + packetBreachConfig.ts TIER_REWARDS).
 * Profile stats tab uses the same numeric values via formatStat (ATK/HP as String(value), DEF as percent).
 */

/** Mirrors server ArmyBonusDelta per tier (pre-scale design values). */
interface ArmyBonusDelta {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

const STRENGTH_SCALE = 0.1;
const HEALTH_SCALE = 1 / 9;

/** Same sequence as server/src/config/packetBreachConfig.ts TIER_REWARDS. */
const RAW_TIER_REWARDS: ArmyBonusDelta[] = [
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

function scaledRewardLabel(raw: ArmyBonusDelta): string {
  const strength = round4(raw.strength * STRENGTH_SCALE);
  const health = round4(raw.health * HEALTH_SCALE);
  const defense = raw.defense;

  if (strength > 0) {
    return `Attack +${String(strength)}`;
  }
  if (health > 0) {
    return `Health +${String(health)}`;
  }
  if (defense > 0) {
    return `Defense +${(defense * 100).toFixed(1)}%`;
  }
  throw new Error('programmingFacilityTierConfig: tier reward has no strength, health, or defense delta');
}

export const TIER_CONFIGS: { tier: number; rewardLabel: string; levelRange: string }[] =
  RAW_TIER_REWARDS.map((raw, index) => {
    const tier = index + 1;
    return {
      tier,
      rewardLabel: scaledRewardLabel(raw),
      levelRange: `${tier}.1–${tier}.5`,
    };
  });

export function formatCost(cost: number): string {
  return `$${cost.toLocaleString()}`;
}
