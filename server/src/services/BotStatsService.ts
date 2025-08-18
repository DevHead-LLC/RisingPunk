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
      console.log('✅ BotStatsService: Configs loaded successfully');
    } catch (error) {
      console.error('❌ BotStatsService: Failed to load configs:', error);
      throw error;
    }
  }

  static getBaseStats(botType: string): BotBaseStats {
    if (!this.configsLoaded) {
      throw new Error('BotStatsService configs not loaded');
    }

    const botConfig = this.botTypes.get(botType);
    if (!botConfig) {
      throw new Error(`Bot type '${botType}' not found`);
    }

    return botConfig.base;
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

    // Defense: +1% every 2 levels, capped at 30%
    const defenseLevels = Math.floor((userLevel - 1) / growth.defenseEveryNLevels);
    const defense = Math.min(
      baseStats.defense + growth.defensePctPerNLevels * defenseLevels,
      growth.defenseCap
    );

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

  static getAllBotTypes(): string[] {
    return Array.from(this.botTypes.keys());
  }

  static getBotRole(botType: string): string {
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
