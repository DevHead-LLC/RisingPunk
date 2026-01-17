/**
 * @file BattleRewardService.ts
 * @description Handles battle rewards, experience gains, and bot losses when battles conclude
 */

import { User, IUser } from '../models/User';
import { IBattleDocument } from '../models/Battle';
import { NodeOwner, BotType } from '../types/battle';

export interface BattleRewardResult {
  success: boolean;
  experienceGained?: number;
  moneyGained?: number;
  botLosses?: { [key in BotType]: number };
  levelUp?: {
    levelsGained: number;
    newLevel: number;
  };
  error?: string;
}

export class BattleRewardService {
  /**
   * Process battle rewards and losses for a user
   * Only rewards if user wins and enemy has 0 remaining battalions (complete victory)
   */
  static async processBattleRewards(
    battle: IBattleDocument,
    userId: string
  ): Promise<BattleRewardResult> {
    try {
      const userWon = battle.winner === NodeOwner.USER;

      // Check if this was a battle against an NPC
      const npcSlug = (battle as any).defenderNpcSlug;
      if (!npcSlug) {
        return { success: false, error: 'Not a battle against NPC' };
      }

      // Calculate bot losses from user battalions (regardless of who won)
      const userStartingBattalions = battle.startingBattalions?.filter(b => b.owner === NodeOwner.USER) || [];
      const userEndingBattalions = battle.battalions.filter(b => b.owner === NodeOwner.USER);
      
      const botLosses: { [key in BotType]: number } = {
        guardian: 0,
        breacher: 0,
        phreak: 0
      };

      // Calculate losses for each battalion type
      userStartingBattalions.forEach(startingBattalion => {
        const endingBattalion = userEndingBattalions.find(b => b.id === startingBattalion.id);
        const startingQuantity = startingBattalion.quantity;
        const endingQuantity = endingBattalion?.quantity || 0;
        const losses = startingQuantity - endingQuantity;
        
        if (losses > 0) {
          botLosses[startingBattalion.type as BotType] += losses;
        }
      });

      // Update bot counts (reduce by losses) - always do this regardless of who won
      const Bot = require('../models/Bot');
      const botDoc = await Bot.findOne({ userId });
      if (botDoc) {
        botDoc.bots.guardian = Math.max(0, botDoc.bots.guardian - botLosses.guardian);
        botDoc.bots.breacher = Math.max(0, botDoc.bots.breacher - botLosses.breacher);
        botDoc.bots.phreak = Math.max(0, botDoc.bots.phreak - botLosses.phreak);
        
        await botDoc.save();
      }

      // Only give experience and money rewards if user won
      let experienceGained: number | undefined;
      let moneyGained: number | undefined;
      let levelUp: { levelsGained: number; newLevel: number } | undefined;

      if (userWon) {
        // Check if this is a complete victory (enemy has 0 remaining battalions)
        const enemyBattalions = battle.battalions.filter(b => b.owner === NodeOwner.ENEMY);
        const hasEnemyRemaining = enemyBattalions.some(b => b.quantity > 0);
        
        if (hasEnemyRemaining) {
          return { success: true, botLosses }; // Still return bot losses even if no rewards
        }

        // Get NPC data for rewards
        const { NPCService } = require('./NPCService');
        const npc = await NPCService.getNPCBySlug(npcSlug);
        if (!npc) {
          return { success: true, botLosses }; // Still return bot losses even if no rewards
        }

        // Update user experience using LevelingService to trigger level ups
        experienceGained = npc.battleExperienceReward;
        
        if (experienceGained) {
          const { LevelingService } = require('./LevelingService');
          const levelingResult = await LevelingService.applyExperience(userId, experienceGained);
          
          // Check if user leveled up
          if (levelingResult.levelsGained > 0) {
            levelUp = {
              levelsGained: levelingResult.levelsGained,
              newLevel: levelingResult.level
            };
          }
        }

        // Update user balance
        moneyGained = npc.victoryReward;
        if (moneyGained) {
          const user = await User.findById(userId);
          if (user) {
            user.balance.total += moneyGained;
            user.balance.lastUpdated = new Date();
            
            // Check and update lifetime high net worth
            const { LifetimeHighNetWorthService } = await import('./LifetimeHighNetWorthService');
            await LifetimeHighNetWorthService.checkAndUpdateLifetimeHigh(user);
            
            await user.save();
          }
        }
      }

      // Store processed rewards in battle document for client response
      (battle as any).processedRewards = {
        experienceGained,
        moneyGained,
        botLosses,
        levelUp
      };
            
      await battle.save();

      return {
        success: true,
        experienceGained,
        moneyGained,
        botLosses,
        levelUp
      };

    } catch (error) {
      console.error('❌ BATTLE REWARDS: Error processing battle rewards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's current bot counts
   */
  static async getUserBotCounts(userId: string): Promise<{ [key in BotType]: number } | null> {
    try {
      const Bot = require('../models/Bot');
      const botDoc = await Bot.findOne({ userId });
      if (!botDoc) return null;

      return {
        guardian: botDoc.bots.guardian,
        breacher: botDoc.bots.breacher,
        phreak: botDoc.bots.phreak
      };
    } catch (error) {
      console.error('❌ BATTLE REWARDS: Error getting user bot counts:', error);
      return null;
    }
  }
}
