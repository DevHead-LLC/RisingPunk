/**
 * @file BattleInventorySettlementService.ts
 * @description Handles inventory settlement for both users at battle end in user-vs-user battles
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BotType, NodeOwner } from '../types/battle';
import mongoose from 'mongoose';
import { getInventoryKey } from '../utils/botInventoryKeys';

export class BattleInventorySettlementService {
  private static readonly KAITO_HUNTER_BATTALION_ID_PREFIX = 'hunter-kaito-';

  private static isSyntheticHunterBattalion(
    battalion: { id?: string | null; owner?: NodeOwner; type?: BotType }
  ): boolean {
    if (battalion.owner !== NodeOwner.USER) {
      return false;
    }
    if (battalion.type !== BotType.GUARDIAN) {
      return false;
    }
    return String(battalion.id ?? '').startsWith(
      BattleInventorySettlementService.KAITO_HUNTER_BATTALION_ID_PREFIX
    );
  }
  
  /**
   * Process inventory settlement for both users at battle end
   * Called from BattleService.handleBattleEnd before endBattle
   */
  static async processBattleEndSettlement(battle: IBattleDocument): Promise<void> {
    try {
      // Only process user defender battles
      if (!battle.isUserDefender) {
        return;
      }


      // Process attacker inventory settlement
      await this.processAttackerSettlement(battle);
      
      // Process defender inventory settlement
      await this.processDefenderSettlement(battle);
      
      
    } catch (error) {
      console.error(`BattleInventorySettlementService processBattleEndSettlement error:`, error);
      throw error; // Re-throw to let BattleService handle the error
    }
  }

  /**
   * Process attacker inventory settlement
   * Attacker's assignments were reduced up-front, so we add survivors back
   */
  private static async processAttackerSettlement(battle: IBattleDocument): Promise<void> {
    try {
      const attackerId = battle.attackerId;
      
      // Get attacker's bot inventory
      const BotModel = mongoose.model('Bot');
      const attackerBots = await BotModel.findOne({ userId: attackerId });
      if (!attackerBots) {
        console.warn(`BattleInventorySettlementService: No bot inventory found for attacker ${attackerId}`);
        return;
      }

      // Calculate survivors per type from startingBattalions vs ending battalions
      const startingBattalions = battle.startingBattalions || [];
      const endingBattalions = battle.battalions || [];
      
      const survivorsByInventoryKey: Record<string, number> = {};

      for (const endingBattalion of endingBattalions) {
        if (
          endingBattalion.owner === NodeOwner.USER &&
          !endingBattalion.isDestroyed &&
          !this.isSyntheticHunterBattalion(endingBattalion)
        ) {
          const mark =
            typeof endingBattalion.mark === 'number' && endingBattalion.mark >= 2 ? 2 : 1;
          const invKey = getInventoryKey(endingBattalion.type as BotType, mark);
          survivorsByInventoryKey[invKey] =
            (survivorsByInventoryKey[invKey] || 0) + endingBattalion.quantity;
        }
      }

      let inventoryUpdated = false;
      for (const [invKey, survivorCount] of Object.entries(survivorsByInventoryKey)) {
        if (survivorCount > 0) {
          const currentCount = attackerBots.bots[invKey as keyof typeof attackerBots.bots] || 0;
          attackerBots.bots[invKey as keyof typeof attackerBots.bots] = currentCount + survivorCount;
          inventoryUpdated = true;
        }
      }

      // Clear battalion assignments for used battalionIds
      const usedBattalionIds = startingBattalions
        .filter(b => b.owner === NodeOwner.USER)
        .map(b => b.id);
      const currentAssignments = attackerBots.battalionAssignments || [];
      const nextAssignments = currentAssignments.filter(
        (assignment: any) => !usedBattalionIds.includes(assignment.battalionId)
      );
      const assignmentsChanged = nextAssignments.length !== currentAssignments.length;
      if (assignmentsChanged) {
        attackerBots.battalionAssignments = nextAssignments;
      }

      if (inventoryUpdated || assignmentsChanged) {
        await attackerBots.save();
      }
      
    } catch (error) {
      console.error(`BattleInventorySettlementService processAttackerSettlement error:`, error);
      throw error;
    }
  }

  /**
   * Process defender inventory settlement
   * Defender's inventory was decremented on deployment, so we add survivors back
   */
  private static async processDefenderSettlement(battle: IBattleDocument): Promise<void> {
    try {
      const defenderId = battle.defenderId;
      
      // Get defender's bot inventory
      const BotModel = mongoose.model('Bot');
      const defenderBots = await BotModel.findOne({ userId: defenderId });
      if (!defenderBots) {
        console.warn(`BattleInventorySettlementService: No bot inventory found for defender ${defenderId}`);
        return;
      }

      const endingBattalions = battle.battalions || [];

      const survivorsByInventoryKey: Record<string, number> = {};

      for (const endingBattalion of endingBattalions) {
        if (endingBattalion.owner === NodeOwner.ENEMY && !endingBattalion.isDestroyed) {
          const mark =
            typeof endingBattalion.mark === 'number' && endingBattalion.mark >= 2 ? 2 : 1;
          const invKey = getInventoryKey(endingBattalion.type as BotType, mark);
          survivorsByInventoryKey[invKey] =
            (survivorsByInventoryKey[invKey] || 0) + endingBattalion.quantity;
        }
      }

      let inventoryUpdated = false;
      for (const [invKey, survivorCount] of Object.entries(survivorsByInventoryKey)) {
        if (survivorCount > 0) {
          const currentCount = defenderBots.bots[invKey as keyof typeof defenderBots.bots] || 0;
          defenderBots.bots[invKey as keyof typeof defenderBots.bots] = currentCount + survivorCount;
          inventoryUpdated = true;
        }
      }

      if (inventoryUpdated) {
        await defenderBots.save();
      }
      
    } catch (error) {
      console.error(`BattleInventorySettlementService processDefenderSettlement error:`, error);
      throw error;
    }
  }

  /**
   * Validate that defender has sufficient bots before battle starts
   * Called from BattleSetupService to prevent battles with insufficient inventory
   */
  static async validateDefenderInventory(defenderId: string): Promise<{ valid: boolean; totalBots: number; error?: string }> {
    try {
      const BotModel = mongoose.model('Bot');
      const defenderBots = await BotModel.findOne({ userId: defenderId });
      if (!defenderBots || !defenderBots.bots) {
        return { valid: false, totalBots: 0, error: 'No bot inventory found' };
      }

      const totalBots = Object.values(defenderBots.bots).reduce((sum: number, count: any) => sum + (count || 0), 0);
      
      if (totalBots === 0) {
        return { valid: false, totalBots: 0, error: 'No bots available for defense' };
      }

      return { valid: true, totalBots };
      
    } catch (error) {
      console.error(`BattleInventorySettlementService validateDefenderInventory error:`, error);
      return { valid: false, totalBots: 0, error: 'Failed to validate inventory' };
    }
  }
}
