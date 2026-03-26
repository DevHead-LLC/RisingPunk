import { BotStatsService, EffectiveBotStats } from './BotStatsService';
import { getFamilyMarkStatsKey, getInventoryKey } from '../utils/botInventoryKeys';

export interface BotConfig {
  role: string;
  stats: EffectiveBotStats;
}

/** Optional infantry (breacher) bonus from e.g. Packet Breach tier rewards; applied only when botType is breacher. */
export interface ArmyBonus {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

/** Optional Cavalry (Guardian) bonus from e.g. Race Condition Heist tier rewards; applied only when botType is guardian. */
export type GuardianBonus = ArmyBonus;

/** Programming bonus for Range bot type (Phreaks) from Binary Bank Crack. Same stats as Infantry/Cavalry: strength, defense, speed, health. Applied in battle, Digital Barracks, and Profile > Stats. */
export interface PhreakBonus {
  strength: number;
  defense: number;
  speed: number;
  health: number;
}

export class BotService {
  /**
   * @param botType Family: `breacher` | `guardian` | `phreak` (bonuses follow family).
   * @param markLevel Mark I uses `bot_types` keys `breacher` etc.; Mark II uses `breacherM2` / `guardianM2` / `phreakM2`.
   * Level growth is always computed from Mark I curves, then **added** to the mark base (×3 etc. applies to bases only).
   */
  static async getUserBotStats(
    botType: string,
    userLevel: number,
    armyBonus?: ArmyBonus,
    guardianBonus?: GuardianBonus,
    phreakBonus?: PhreakBonus,
    markLevel: 1 | 2 = 1
  ): Promise<BotConfig> {
    try {
      const statsKey = getInventoryKey(botType, markLevel);
      const family = botType as 'breacher' | 'guardian' | 'phreak';
      let effectiveStats: EffectiveBotStats =
        statsKey === botType
          ? BotStatsService.computeEffectiveBotStats(statsKey, userLevel)
          : BotStatsService.computeEffectiveBotStatsForDerivedMark(family, statsKey, userLevel);
      if (botType === 'breacher' && armyBonus) {
        effectiveStats = {
          ...effectiveStats,
          offense: effectiveStats.offense + armyBonus.strength,
          health: effectiveStats.health + armyBonus.health,
          defense: effectiveStats.defense + armyBonus.defense,
          speed: effectiveStats.speed + armyBonus.speed,
        };
      }
      if (botType === 'guardian' && guardianBonus) {
        effectiveStats = {
          ...effectiveStats,
          offense: effectiveStats.offense + guardianBonus.strength,
          health: effectiveStats.health + guardianBonus.health,
          defense: effectiveStats.defense + guardianBonus.defense,
          speed: effectiveStats.speed + guardianBonus.speed,
        };
      }
      // Range bot type (Phreaks): programming bonus is Attack/Health/Defense/Speed, same as Infantry/Cavalry. Not "attack range" stat.
      if (botType === 'phreak' && phreakBonus) {
        const p = phreakBonus as PhreakBonus & { range?: number };
        if (typeof p.strength === 'number' || typeof p.health === 'number') {
          effectiveStats = {
            ...effectiveStats,
            offense: effectiveStats.offense + (p.strength ?? 0),
            health: effectiveStats.health + (p.health ?? 0),
            defense: effectiveStats.defense + (p.defense ?? 0),
            speed: effectiveStats.speed + (p.speed ?? 0),
          };
        } else if (typeof p.range === 'number') {
          effectiveStats = { ...effectiveStats, range: effectiveStats.range + p.range };
        }
      }
      const role = BotStatsService.getBotRole(statsKey);
      return {
        role,
        stats: effectiveStats,
      };
    } catch (error) {
      console.error(`❌ BotService: Failed to get user bot stats for ${botType} at level ${userLevel}:`, error);
      throw error;
    }
  }

  /**
   * NPC / non-player defenders: same growth rules as users, no programming bonuses.
   * @param markLevel 1 = Mark I `bot_types` key; 2–4 = derived `breacherM2`…`breacherM4` curves.
   */
  static async getEnemyBotStats(
    botType: string,
    userLevel: number,
    markLevel: number = 1
  ): Promise<BotConfig> {
    try {
      const family = botType as 'breacher' | 'guardian' | 'phreak';
      const m = Math.min(4, Math.max(1, Math.floor(markLevel)));
      let effectiveStats: EffectiveBotStats;
      if (m === 1) {
        effectiveStats = BotStatsService.computeEffectiveBotStats(botType, userLevel);
      } else {
        const statsKey = getFamilyMarkStatsKey(family, m);
        effectiveStats = BotStatsService.computeEffectiveBotStatsForDerivedMark(family, statsKey, userLevel);
      }
      const roleKey = m === 1 ? botType : getFamilyMarkStatsKey(family, m);
      const role = BotStatsService.getBotRole(roleKey);
      return {
        role,
        stats: effectiveStats,
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