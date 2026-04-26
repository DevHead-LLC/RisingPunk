import { BotStatsService } from './BotStatsService';
import { LevelingService } from './LevelingService';
import {
  HUNTER_ROSTER_KAITO_GLITCH,
  MAX_HUNTER_LEVEL,
  type HunterEffectiveStats,
  type HunterProgressSnapshot,
  type HunterRosterId,
} from '../types/bugHunt';

type HunterRosterBaseStats = {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
};

const HUNTER_ROSTER_BASE_STATS: Record<HunterRosterId, HunterRosterBaseStats> = {
  kaito_glitch: {
    health: 115000,
    offense: 20000,
    defense: 0.06,
    speed: 9,
    range: 4,
  },
};

function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export class HunterProgressionService {
  static getRequiredExpToNext(level: number): number {
    if (!Number.isInteger(level) || level < 1) {
      throw new Error('Hunter level must be an integer >= 1');
    }
    if (level >= MAX_HUNTER_LEVEL) {
      return 0;
    }
    return LevelingService.getRequiredExpToNextUnchecked(level);
  }

  static createInitialProgressSnapshot(): HunterProgressSnapshot {
    return {
      level: 1,
      currentExp: 0,
      nextLevelExp: this.getRequiredExpToNext(1),
      totalExp: 0,
    };
  }

  static computeEffectiveHunterStats(hunterRosterId: HunterRosterId, hunterLevel: number): HunterEffectiveStats {
    if (!Number.isInteger(hunterLevel) || hunterLevel < 1 || hunterLevel > MAX_HUNTER_LEVEL) {
      throw new Error(`hunterLevel must be an integer within [1, ${MAX_HUNTER_LEVEL}]`);
    }
    const base = HUNTER_ROSTER_BASE_STATS[hunterRosterId];
    if (!base) {
      throw new Error(`Unknown hunterRosterId '${hunterRosterId}'`);
    }
    if (!BotStatsService.isConfigLoaded()) {
      throw new Error('BotStatsService config must be loaded before hunter stat resolution');
    }

    const growth = BotStatsService.getGrowthConfig().shared;
    const health = base.health * (1 + growth.healthPctPerLevel * (hunterLevel - 1));
    const offense = base.offense * (1 + growth.offensePctPerLevel * (hunterLevel - 1));

    const defenseLevels = Math.floor((hunterLevel - 1) / growth.defenseEveryNLevels);
    const defenseFromGrowth = base.defense + growth.defensePctPerNLevels * defenseLevels;
    const perHunterDefenseCap = base.defense + 0.12;
    const defense = Math.min(defenseFromGrowth, perHunterDefenseCap, growth.defenseCap);

    const speedLevels = Math.floor((hunterLevel - 1) / growth.speedEveryNLevels);
    const speed = Math.min(base.speed + growth.speedPerNLevels * speedLevels, base.speed + growth.speedCap);

    return {
      health: roundTo2Decimals(health),
      offense: roundTo2Decimals(offense),
      defense: roundTo2Decimals(defense),
      speed: Math.round(speed),
      range: Math.round(base.range),
    };
  }

  static getCurrentAndNextStats(hunterRosterId: HunterRosterId, hunterLevel: number): {
    current: HunterEffectiveStats;
    next: HunterEffectiveStats | null;
  } {
    const current = this.computeEffectiveHunterStats(hunterRosterId, hunterLevel);
    if (hunterLevel >= MAX_HUNTER_LEVEL) {
      return { current, next: null };
    }
    return {
      current,
      next: this.computeEffectiveHunterStats(hunterRosterId, hunterLevel + 1),
    };
  }

  static applyExperience(
    snapshot: HunterProgressSnapshot,
    amount: number
  ): HunterProgressSnapshot & { levelsGained: number } {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Hunter XP amount must be a positive finite number');
    }

    let level = snapshot.level;
    let currentExp = snapshot.currentExp;
    let totalExp = snapshot.totalExp;
    let remainingExp = amount;
    let levelsGained = 0;

    while (remainingExp > 0 && level < MAX_HUNTER_LEVEL) {
      const requiredForNext = this.getRequiredExpToNext(level);
      const expNeeded = requiredForNext - currentExp;
      if (remainingExp >= expNeeded) {
        remainingExp -= expNeeded;
        currentExp = 0;
        totalExp += expNeeded;
        level += 1;
        levelsGained += 1;
      } else {
        currentExp += remainingExp;
        totalExp += remainingExp;
        remainingExp = 0;
      }
    }

    return {
      level,
      currentExp,
      totalExp,
      nextLevelExp: this.getRequiredExpToNext(level),
      levelsGained,
    };
  }

  static getDefaultRosterIdForMvp(): HunterRosterId {
    return HUNTER_ROSTER_KAITO_GLITCH;
  }
}
