import { User } from '../models/User';

interface LevelingConfig {
  baseRequiredExp: number;
  multiplier: number;
  precision: number;
  maxLevel: number;
}

interface ExperienceSummary {
  level: number;
  experience: {
    current: number;
    nextLevel: number;
    total: number;
  };
  isMaxLevel: boolean;
  levelsGained: number;
}

export class LevelingService {
  private static config: LevelingConfig | null = null;
  private static configLoaded = false;

  static async loadConfig(): Promise<void> {
    if (this.configLoaded) return;

    try {
      const db = require('mongoose').connection.db;
      const configDoc = await db.collection('game_config').findOne({ key: 'userLeveling' });
      
      if (!configDoc) {
        throw new Error('User leveling config not found in database');
      }

      this.config = {
        baseRequiredExp: configDoc.baseRequiredExp,
        multiplier: configDoc.multiplier,
        precision: configDoc.precision,
        maxLevel: configDoc.maxLevel
      };

      this.configLoaded = true;
    } catch (error) {
      console.error('❌ LevelingService: Failed to load config:', error);
      throw error;
    }
  }

  static getRequiredExpToNext(level: number): number {
    if (!this.config) {
      throw new Error('LevelingService config not loaded');
    }

    if (level >= this.config.maxLevel) {
      return 0;
    }

    const requiredExp = this.config.baseRequiredExp * Math.pow(this.config.multiplier, level - 1);
    return this.roundToPrecision(requiredExp);
  }

  static getTotalExpToReach(level: number): number {
    if (!this.config) {
      throw new Error('LevelingService config not loaded');
    }

    if (level <= 1) {
      return 0;
    }

    const totalExp = this.config.baseRequiredExp * (Math.pow(this.config.multiplier, level) - 1) / (this.config.multiplier - 1);
    return this.roundToPrecision(totalExp);
  }

  static isMaxLevel(level: number): boolean {
    if (!this.config) {
      throw new Error('LevelingService config not loaded');
    }

    return level >= this.config.maxLevel;
  }

  static async applyExperience(userId: string, amount: number): Promise<ExperienceSummary> {
    if (!this.config) {
      throw new Error('LevelingService config not loaded');
    }

    if (amount <= 0) {
      throw new Error('Experience amount must be positive');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let currentLevel = user.level;
    let currentExp = user.experience.current;
    let totalExp = user.experience.total || 0;
    let levelsGained = 0;
    let remainingExp = amount;

    while (remainingExp > 0 && currentLevel < this.config.maxLevel) {
      const requiredForNext = this.getRequiredExpToNext(currentLevel);
      const expNeeded = requiredForNext - currentExp;

      if (remainingExp >= expNeeded) {
        remainingExp -= expNeeded;
        currentExp = 0;
        currentLevel++;
        levelsGained++;
        totalExp += expNeeded;
      } else {
        currentExp += remainingExp;
        totalExp += remainingExp;
        remainingExp = 0;
      }
    }

    const nextLevelExp = this.isMaxLevel(currentLevel) ? 0 : this.getRequiredExpToNext(currentLevel);

    const updates: any = {
      level: currentLevel,
      'experience.current': currentExp,
      'experience.nextLevel': nextLevelExp,
      'experience.total': totalExp
    };

    await User.findByIdAndUpdate(userId, updates);

    return {
      level: currentLevel,
      experience: {
        current: currentExp,
        nextLevel: nextLevelExp,
        total: totalExp
      },
      isMaxLevel: this.isMaxLevel(currentLevel),
      levelsGained
    };
  }

  private static roundToPrecision(value: number): number {
    if (!this.config) {
      throw new Error('LevelingService config not loaded');
    }

    const factor = Math.pow(10, this.config.precision);
    return Math.round(value * factor) / factor;
  }

  static async getLevelProgress(userId: string): Promise<ExperienceSummary> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      level: user.level,
      experience: {
        current: user.experience.current,
        nextLevel: user.experience.nextLevel,
        total: user.experience.total || 0
      },
      isMaxLevel: this.isMaxLevel(user.level),
      levelsGained: 0
    };
  }
}
