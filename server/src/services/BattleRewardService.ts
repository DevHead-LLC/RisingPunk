/**
 * @file BattleRewardService.ts
 * @description Handles battle rewards, experience gains, and bot losses when battles conclude
 */

import { User } from '../models/User';
import { IBattleDocument } from '../models/Battle';
import { NodeOwner, BotType } from '../types/battle';
import { defaultBotsInventory, getInventoryKey, type BotInventoryKey } from '../utils/botInventoryKeys';

/** All keys on `Bot.bots` used for loss accounting / reconciliation. */
const BOT_INVENTORY_KEYS: BotInventoryKey[] = [
  'breacher',
  'guardian',
  'phreak',
  'breacherM2',
  'guardianM2',
  'phreakM2',
];

export interface BattleRewardResult {
  success: boolean;
  experienceGained?: number;
  moneyGained?: number;
  /** Per inventory key (Mark I + Mark II); omits zero entries in returned payloads when possible. */
  botLosses?: Partial<Record<BotInventoryKey, number>>;
  levelUp?: {
    levelsGained: number;
    newLevel: number;
  };
  lifetimeHighUpdated?: boolean;
  error?: string;
}

export class BattleRewardService {
  /**
   * Process battle rewards and losses for a user.
   * Bot loss accounting always runs; XP/cash apply on any NPC win (same as `battle.winner`),
   * including timer / point-decided wins where enemy units still remain.
   *
   * NPC XP/money run **before** march survivor inventory reconciliation so a missing `Bot` doc or
   * failed $inc cannot block experience (march settlement errors are logged, not fatal to rewards).
   */
  static async processBattleRewards(
    battle: IBattleDocument,
    userId: string
  ): Promise<BattleRewardResult> {
    try {
      const userWon = battle.winner === NodeOwner.USER;

      const npcSlug = String((battle as any).defenderNpcSlug ?? '').trim();
      if (!npcSlug) {
        return { success: false, error: 'Not a battle against NPC' };
      }

      // Calculate bot losses from user battalions (regardless of who won)
      const userStartingBattalions = battle.startingBattalions?.filter(b => b.owner === NodeOwner.USER) || [];
      const userEndingBattalions = battle.battalions.filter(b => b.owner === NodeOwner.USER);

      const botLosses: Record<BotInventoryKey, number> = defaultBotsInventory();

      userStartingBattalions.forEach(startingBattalion => {
        const endingBattalion = userEndingBattalions.find(b => b.id === startingBattalion.id);
        const startingQuantity = startingBattalion.quantity;
        const endingQuantity = endingBattalion?.quantity || 0;
        const losses = startingQuantity - endingQuantity;

        if (losses > 0) {
          const invKey = getInventoryKey(
            String(startingBattalion.type),
            typeof startingBattalion.mark === 'number' && Number.isFinite(startingBattalion.mark)
              ? startingBattalion.mark
              : 1
          );
          botLosses[invKey] += losses;
        }
      });

      let experienceGained: number | undefined;
      let moneyGained: number | undefined;
      let levelUp: { levelsGained: number; newLevel: number } | undefined;
      let lifetimeHighUpdated = false;

      // Apply NPC XP and cash on win first — must not depend on march Bot collection writes.
      if (userWon) {
        const { NPCService } = require('./NPCService');
        const npc = await NPCService.getNPCBySlug(npcSlug);
        if (!npc) {
          console.error(
            '[BattleRewardService] NPC not found; cannot grant XP/cash. slug=',
            npcSlug,
            'battleId=',
            battle.battleId
          );
        } else {
          experienceGained = npc.battleExperienceReward;
          if (typeof experienceGained === 'number' && Number.isFinite(experienceGained) && experienceGained > 0) {
            const { LevelingService } = require('./LevelingService');
            const levelingResult = await LevelingService.applyExperience(userId, experienceGained);

            if (levelingResult.levelsGained > 0) {
              levelUp = {
                levelsGained: levelingResult.levelsGained,
                newLevel: levelingResult.level
              };
            }
          }

          moneyGained = npc.victoryReward;
          if (typeof moneyGained === 'number' && Number.isFinite(moneyGained) && moneyGained > 0) {
            const user = await User.findById(userId);
            if (user) {
              user.balance.total += moneyGained;
              user.balance.lastUpdated = new Date();

              const { LifetimeHighNetWorthService } = await import('./LifetimeHighNetWorthService');
              lifetimeHighUpdated = LifetimeHighNetWorthService.checkAndUpdateLifetimeHigh(user);

              await user.save();
            }
          }
        }
      }

      const marchSourced = (battle as { marchSourcedAttack?: boolean }).marchSourcedAttack === true;
      const Bot = require('../models/Bot');
      let swarmSourced = false;
      if (marchSourced && (battle as { sourceMarchId?: string }).sourceMarchId) {
        try {
          const { AttackMarch } = await import('../models/AttackMarch');
          const m = await AttackMarch.findOne({ marchId: String((battle as { sourceMarchId?: string }).sourceMarchId) })
            .select('swarmSessionId')
            .lean();
          swarmSourced = Boolean(m?.swarmSessionId);
        } catch (swarmDetectErr) {
          console.error('[BattleRewardService] failed to detect swarm march source:', swarmDetectErr);
        }
      }

      if (marchSourced && !swarmSourced) {
        const survivorIncrements: Partial<Record<BotInventoryKey, number>> = {};
        for (const b of userEndingBattalions) {
          if (b.quantity <= 0) continue;
          const invKey = getInventoryKey(String(b.type), b.mark);
          survivorIncrements[invKey] = (survivorIncrements[invKey] || 0) + b.quantity;
        }
        const $inc: Record<string, number> = {};
        for (const [k, v] of Object.entries(survivorIncrements)) {
          if (v > 0) {
            $inc[`bots.${k}`] = v;
          }
        }
        if (Object.keys($inc).length > 0) {
          const upd = await Bot.findOneAndUpdate({ userId }, { $inc }, { new: true });
          if (!upd) {
            console.error(
              '[BattleRewardService] March bot survivor reconciliation failed (no Bot doc). userId=',
              userId,
              'battleId=',
              battle.battleId,
              '— XP/cash already applied if attacker won.'
            );
          }
        }
      } else if (!marchSourced) {
        // Non-march NPC battle: bots were never committed onto a march; decrement from barracks (Mark I + Mark II keys).
        const botDoc = await Bot.findOne({ userId });
        if (botDoc) {
          for (const k of BOT_INVENTORY_KEYS) {
            const lost = botLosses[k];
            if (lost > 0) {
              const cur = botDoc.bots[k] ?? 0;
              botDoc.bots[k] = Math.max(0, cur - lost);
            }
          }
          await botDoc.save();
        }
      }
      // marchSourced && swarmSourced: troops left inventory at swarm commit; not this legacy subtract / solo-march $inc.

      const botLossesForPayload: Partial<Record<BotInventoryKey, number>> = {};
      for (const k of BOT_INVENTORY_KEYS) {
        const v = botLosses[k];
        if (typeof v === 'number' && v > 0) {
          botLossesForPayload[k] = v;
        }
      }

      (battle as any).processedRewards = {
        experienceGained,
        moneyGained,
        botLosses: botLossesForPayload,
        levelUp,
        lifetimeHighUpdated
      };

      await battle.save();

      return {
        success: true,
        experienceGained,
        moneyGained,
        botLosses: botLossesForPayload,
        levelUp,
        lifetimeHighUpdated
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
