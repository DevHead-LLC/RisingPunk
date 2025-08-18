import { BotStatsService, EffectiveBotStats } from './BotStatsService';

export interface BotConfig {
  role: string;
  stats: EffectiveBotStats;
}

export class BotService {
  static async getUserBotStats(botType: string, userLevel: number): Promise<BotConfig> {
    try {
      const effectiveStats = BotStatsService.computeEffectiveBotStats(botType, userLevel);
      const role = BotStatsService.getBotRole(botType);
      
      return {
        role,
        stats: effectiveStats
      };
    } catch (error) {
      console.error(`❌ BotService: Failed to get user bot stats for ${botType} at level ${userLevel}:`, error);
      throw error;
    }
  }

  static async getEnemyBotStats(botType: string, userLevel: number): Promise<BotConfig> {
    try {
      // For enemies, we can use the same base stats but potentially apply different modifiers
      // For now, using the same calculation as user bots
      const effectiveStats = BotStatsService.computeEffectiveBotStats(botType, userLevel);
      const role = BotStatsService.getBotRole(botType);
      
      return {
        role,
        stats: effectiveStats
      };
    } catch (error) {
      console.error(`❌ BotService: Failed to get enemy bot stats for ${botType} at level ${userLevel}:`, error);
      throw error;
    }
  }

  static async getAllBotTypes(): Promise<string[]> {
    return BotStatsService.getAllBotTypes();
  }

  // Legacy compatibility - returns default level 1 stats if needed
  static getLegacyBotStats(botType: string): BotConfig {
    const legacyStats = {
      guardian: {
        role: 'Cavalry',
        stats: { health: 14, speed: 9, range: 4, offense: 8, defense: 6 }
      },
      breacher: {
        role: 'Infantry', 
        stats: { health: 18, speed: 5, range: 5, offense: 7, defense: 8 }
      },
      phreak: {
        role: 'Ranged',
        stats: { health: 12, speed: 7, range: 9, offense: 6, defense: 5 }
      }
    };

    return legacyStats[botType as keyof typeof legacyStats] || legacyStats.guardian;
  }
} 