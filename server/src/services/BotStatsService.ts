import { deriveMarkBaseStatsFromMark1 } from '../utils/mark2BaseStatsFromMark1';

interface BotBaseStats {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
}

interface BotTypeConfig {
  key: string;
  role: string;
  base: BotBaseStats;
  updatedAt: Date;
}

interface GrowthConfig {
  shared: {
    healthPctPerLevel: number;
    offensePctPerLevel: number;
    defensePctPerNLevels: number;
    defenseEveryNLevels: number;
    defenseCap: number;
    speedPerNLevels: number;
    speedEveryNLevels: number;
    speedCap: number;
    rangeMilestones: number[];
  };
  perTypeOverrides: Record<string, any>;
  updatedAt: Date;
}

interface TypeAdvantage {
  multipliers: {
    breacher: { phreak: number };
    phreak: { guardian: number };
    guardian: { breacher: number };
  };
  enabled: boolean;
  updatedAt: Date;
}

export interface EffectiveBotStats {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
}

/** Inventory/stat keys for Mark II+ that are derived from Mark I `bot_types` bases (no separate DB row required). */
const DERIVED_MARK_FROM_M1: Record<
  string,
  { family: 'breacher' | 'guardian' | 'phreak'; markLevel: number }
> = {
  breacherM2: { family: 'breacher', markLevel: 2 },
  guardianM2: { family: 'guardian', markLevel: 2 },
  phreakM2: { family: 'phreak', markLevel: 2 },
  breacherM3: { family: 'breacher', markLevel: 3 },
  guardianM3: { family: 'guardian', markLevel: 3 },
  phreakM3: { family: 'phreak', markLevel: 3 },
  breacherM4: { family: 'breacher', markLevel: 4 },
  guardianM4: { family: 'guardian', markLevel: 4 },
  phreakM4: { family: 'phreak', markLevel: 4 },
};

export class BotStatsService {
  private static botTypes: Map<string, BotTypeConfig> = new Map();
  private static growthConfig: GrowthConfig | null = null;
  private static typeAdvantages: TypeAdvantage | null = null;
  private static configsLoaded = false;

  static async loadConfigs(): Promise<void> {
    if (this.configsLoaded) return;

    try {
      const db = require('mongoose').connection.db;
      
      // Load bot types
      const botTypesCursor = await db.collection('bot_types').find({});
      for await (const doc of botTypesCursor) {
        this.botTypes.set(doc.key, doc);
      }

      // Load growth config
      const growthDoc = await db.collection('bot_growth_config').findOne({ key: 'default_growth' });
      if (!growthDoc) {
        throw new Error('Bot growth config not found');
      }
      this.growthConfig = growthDoc;

      // Load type advantages
      const advantageDoc = await db.collection('combat_type_advantages').findOne({ key: 'rps_multipliers' });
      if (!advantageDoc) {
        throw new Error('Combat type advantages not found');
      }
      this.typeAdvantages = advantageDoc;

      this.configsLoaded = true;
    } catch (error) {
      console.error('❌ BotStatsService: Failed to load configs:', error);
      throw error;
    }
  }

  /** Mark II+ keys (`breacherM2`, …) derive from Mark I DB bases via `deriveMarkBaseStatsFromMark1`. */
  private static getBaseStatsFromDb(botType: string): BotBaseStats {
    const botConfig = this.botTypes.get(botType);
    if (!botConfig) {
      throw new Error(`Bot type '${botType}' not found`);
    }
    return { ...botConfig.base };
  }

  /** Returns a copy so callers cannot mutate the cached config. */
  static getBaseStats(botType: string): BotBaseStats {
    if (!this.configsLoaded) {
      throw new Error('BotStatsService configs not loaded');
    }

    const derived = DERIVED_MARK_FROM_M1[botType];
    if (derived) {
      const m1Base = this.getBaseStatsFromDb(derived.family);
      return deriveMarkBaseStatsFromMark1(m1Base, derived.markLevel);
    }

    return this.getBaseStatsFromDb(botType);
  }

  static getGrowthConfig(): GrowthConfig {
    if (!this.configsLoaded || !this.growthConfig) {
      throw new Error('BotStatsService configs not loaded');
    }

    return this.growthConfig;
  }

  static getTypeAdvantage(attackerType: string, targetType: string): number {
    if (!this.configsLoaded || !this.typeAdvantages) {
      throw new Error('BotStatsService configs not loaded');
    }

    if (!this.typeAdvantages.enabled) {
      return 1.0;
    }

    const attackerMultipliers = this.typeAdvantages.multipliers[attackerType as keyof typeof this.typeAdvantages.multipliers];
    if (!attackerMultipliers) {
      return 1.0;
    }

    const multiplier = attackerMultipliers[targetType as keyof typeof attackerMultipliers];
    return multiplier || 1.0;
  }

  static computeEffectiveBotStats(botType: string, userLevel: number): EffectiveBotStats {
    if (!this.configsLoaded || !this.growthConfig) {
      throw new Error('BotStatsService configs not loaded');
    }

    const baseStats = this.getBaseStats(botType);
    const growth = this.growthConfig.shared;

    // Health: +5% per level
    const health = baseStats.health * (1 + growth.healthPctPerLevel * (userLevel - 1));

    // Offense: +5% per level
    const offense = baseStats.offense * (1 + growth.offensePctPerLevel * (userLevel - 1));

    // Defense: +0.5% every 2 levels; cap at growth.defenseCap and per-type cap (base + 12 pts on 0–1 scale)
    const defenseLevels = Math.floor((userLevel - 1) / growth.defenseEveryNLevels);
    const fromGrowth = baseStats.defense + growth.defensePctPerNLevels * defenseLevels;
    const perTypeDefenseCap = baseStats.defense + 0.12;
    const defense = Math.min(fromGrowth, perTypeDefenseCap, growth.defenseCap);

    // Speed: +1 every 5 levels, capped at base + 3
    const speedLevels = Math.floor((userLevel - 1) / growth.speedEveryNLevels);
    const speed = Math.min(
      baseStats.speed + growth.speedPerNLevels * speedLevels,
      baseStats.speed + growth.speedCap
    );

    // Range: fixed for now
    const range = baseStats.range;

    return {
      health: this.roundTo2Decimals(health),
      offense: this.roundTo2Decimals(offense),
      defense: this.roundTo2Decimals(defense),
      speed: Math.round(speed),
      range: Math.round(range)
    };
  }

  /**
   * Mark II+ (keys in `DERIVED_MARK_FROM_M1`): user level growth is computed from **Mark I** only, then added as a flat delta.
   * Total = mark base + (effective M1 − M1 base). Programming/research bonuses stack the same way via `BotService.getUserBotStats`.
   * Do not call `computeEffectiveBotStats(markKey, level)` for derived keys — that would scale % growth on the larger mark base.
   */
  static computeEffectiveBotStatsForDerivedMark(
    familyKey: 'breacher' | 'guardian' | 'phreak',
    markStatsKey: string,
    userLevel: number
  ): EffectiveBotStats {
    const derived = DERIVED_MARK_FROM_M1[markStatsKey];
    if (!derived || derived.family !== familyKey) {
      throw new Error(`Invalid derived mark key or family: ${markStatsKey} / ${familyKey}`);
    }

    const baseM1 = this.getBaseStats(familyKey);
    const effectiveM1 = this.computeEffectiveBotStats(familyKey, userLevel);
    const baseMk = this.getBaseStats(markStatsKey);

    const health = baseMk.health + (effectiveM1.health - baseM1.health);
    const offense = baseMk.offense + (effectiveM1.offense - baseM1.offense);
    const defense = baseMk.defense + (effectiveM1.defense - baseM1.defense);
    const speed = baseMk.speed + (effectiveM1.speed - baseM1.speed);
    const range = baseMk.range + (effectiveM1.range - baseM1.range);

    return {
      health: this.roundTo2Decimals(health),
      offense: this.roundTo2Decimals(offense),
      defense: this.roundTo2Decimals(defense),
      speed: Math.round(speed),
      range: Math.round(range),
    };
  }

  static getAllBotTypes(): string[] {
    return Array.from(this.botTypes.keys());
  }

  /** Mark II inventory/stat keys are always supported (derived from Mark I). */
  static hasBotTypeKey(key: string): boolean {
    if (!this.configsLoaded) {
      throw new Error('BotStatsService configs not loaded');
    }
    if (DERIVED_MARK_FROM_M1[key]) {
      return true;
    }
    return this.botTypes.has(key);
  }

  static getBotRole(botType: string): string {
    const derived = DERIVED_MARK_FROM_M1[botType];
    if (derived) {
      return this.getBotRole(derived.family);
    }
    const botConfig = this.botTypes.get(botType);
    return botConfig?.role || 'unknown';
  }

  private static roundTo2Decimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  static isConfigLoaded(): boolean {
    return this.configsLoaded;
  }
}
