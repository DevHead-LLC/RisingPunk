/**
 * @file DefenderDeploymentService.ts
 * @description Handles wave-based deployment of defender battalions in user-vs-user battles
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BotType, IBattalion, INode } from '../types/battle';
import { BattalionFactory } from './BattalionFactory';
import { AttackService } from './AttackService';
import mongoose from 'mongoose';
import { parseInventoryKeyToFamilyAndMark, BotInventoryKey } from '../utils/botInventoryKeys';
import { syncAndResolveUserBotProgrammingBonuses } from '../utils/syncUserBotProgrammingBonuses';
import { getCrewArmyBonusTotalsForUser, mergeCrewArmyIntoArmyBonus } from '../utils/researchFeatureUtils';
import {
  battleEngineNowMs,
  getHeadlessWorkingBattle,
  headlessDeterministicPickIndex,
  isHeadlessWorkingBattleActive,
} from './HeadlessBattleRunner';

// Safety constants for defender deployment
const MAX_DEFENDER_PER_BATTALION = 250000;
const MAX_DEFENDER_BATTALIONS_PER_SECOND = 6;
const MIN_BATTLE_TIME_FOR_DEPLOYMENT = 0; // Start deploying immediately
const MAX_BATTLE_TIME_FOR_DEPLOYMENT = 45; // Stop deploying at battle end

const EMPTY_DEFENDER_DEPLOYED_TOTALS = {
  guardian: 0,
  breacher: 0,
  phreak: 0,
  guardianM2: 0,
  breacherM2: 0,
  phreakM2: 0,
} as const;

export class DefenderDeploymentService {
  private static sumDefenderDeployedTotals(
    t: IBattleDocument['defenderDeployedTotals']
  ): number {
    if (!t) {
      return 0;
    }
    return (
      t.guardian +
      t.breacher +
      t.phreak +
      (t.guardianM2 ?? 0) +
      (t.breacherM2 ?? 0) +
      (t.phreakM2 ?? 0)
    );
  }

  /**
   * Process a battle tick for defender deployment
   * Called once per second during active battle phase
   */
  static async onTick(battleId: string): Promise<void> {
    const battle = getHeadlessWorkingBattle(battleId) ?? (await Battle.findOne({ battleId }));
    if (!battle) {
      return;
    }

    // Ensure screen dimensions are available for this battle
    if (!(battle as any).screenWidth || !(battle as any).screenHeight) {
      throw new Error(
        `Screen dimensions not set for battle ${battleId}. Cannot process defender deployment.`
      );
    }

    // Only process user defender battles
    if (!battle.isUserDefender) {
      return;
    }

    // Don't deploy if battle is over or deployment is exhausted
    if (battle.phase === 'complete' || battle.defenderDeploymentExhausted) {
      return;
    }

    const deployedSum = this.sumDefenderDeployedTotals(battle.defenderDeployedTotals);
    const isFirstWave = deployedSum === 0;

    if (isFirstWave) {
      // First wave - deploy immediately regardless of phase
    } else {
      // Subsequent waves - only during active phase and respect tick timing
      if (battle.phase !== 'active') {
        return;
      }

      // Don't deploy if we've already processed this tick
      if ((battle.lastTickProcessed || 0) >= battle.battleTime) {
        return;
      }

      // Additional safety checks for subsequent waves
      if (battle.battleTime < MIN_BATTLE_TIME_FOR_DEPLOYMENT || battle.battleTime > MAX_BATTLE_TIME_FOR_DEPLOYMENT) {
        return;
      }
    }

    await this.deployWave(battle);

    if (isHeadlessWorkingBattleActive(battleId)) {
      battle.lastTickProcessed = battle.battleTime;
    } else {
      await Battle.updateOne(
        { _id: battle._id },
        {
          $set: { lastTickProcessed: battle.battleTime },
          $setOnInsert: {
            defenderDeployedTotals: { ...EMPTY_DEFENDER_DEPLOYED_TOTALS },
            startingBattalions: [],
          },
        }
      );
    }
  }

  /**
   * Deploy a wave of up to 6 battalions
   */
  private static async deployWave(battle: IBattleDocument): Promise<void> {
    const BotModel = mongoose.model('Bot');
    const defenderBots = await BotModel.findOne({ userId: battle.defenderId });
    if (!defenderBots || !defenderBots.bots) {
      return;
    }

    const resolved = await syncAndResolveUserBotProgrammingBonuses(battle.defenderId);
    const defenderCrew = await getCrewArmyBonusTotalsForUser(battle.defenderId);
    const defenderLevel = resolved.userLevel;
    const defenderArmyBonus = mergeCrewArmyIntoArmyBonus(resolved.armyBonusForStats, defenderCrew);
    const defenderGuardianBonus = mergeCrewArmyIntoArmyBonus(resolved.guardianBonusForStats, defenderCrew);
    const defenderPhreakBonus = mergeCrewArmyIntoArmyBonus(resolved.phreakBonusForStats, defenderCrew);

    // Check if we have any bots left to deploy
    const totalAvailable = Object.values(defenderBots.bots).reduce((sum: number, count: any) => sum + (count || 0), 0);
    if (totalAvailable === 0) {
      battle.defenderDeploymentExhausted = true;
      if (!isHeadlessWorkingBattleActive(battle.battleId)) {
        await battle.save();
      }
      return;
    }

    // We want to deploy ALL available bots, up to 6 battalions per second
    const maxBattalionsThisTick = Math.min(MAX_DEFENDER_BATTALIONS_PER_SECOND, totalAvailable);

    const deployments: Array<{ battalion: IBattalion; inventoryKey: BotInventoryKey; quantity: number }> = [];
    let remainingBots: Record<string, number> = { ...defenderBots.bots };

    for (let i = 0; i < maxBattalionsThisTick; i++) {
      const deploymentResult = await this.prepareSingleBattalion(
        battle,
        remainingBots,
        i,
        defenderLevel,
        defenderArmyBonus,
        defenderGuardianBonus,
        defenderPhreakBonus
      );

      if (
        deploymentResult.success &&
        deploymentResult.battalion &&
        deploymentResult.inventoryKey &&
        deploymentResult.quantity != null
      ) {
        deployments.push({
          battalion: deploymentResult.battalion,
          inventoryKey: deploymentResult.inventoryKey,
          quantity: deploymentResult.quantity,
        });

        remainingBots[deploymentResult.inventoryKey] -= deploymentResult.quantity;
      } else {
        break;
      }
    }

    if (deployments.length > 0) {
      battle.defenderDeployedTotals = {
        ...EMPTY_DEFENDER_DEPLOYED_TOTALS,
        ...(battle.defenderDeployedTotals ?? {}),
      };
      const totals = battle.defenderDeployedTotals;

      for (const deployment of deployments) {
        const k = deployment.inventoryKey as keyof typeof totals;
        totals[k] = (totals[k] ?? 0) + deployment.quantity;

        battle.battalions.push(deployment.battalion);
        if (battle.startingBattalions) {
          battle.startingBattalions.push(deployment.battalion);
        }
      }

      const botInc: Record<string, number> = {};
      const defenderTotalsInc: Record<string, number> = {};
      for (const d of deployments) {
        const botPath = `bots.${d.inventoryKey}`;
        botInc[botPath] = (botInc[botPath] ?? 0) - d.quantity;
        const totPath = `defenderDeployedTotals.${d.inventoryKey}`;
        defenderTotalsInc[totPath] = (defenderTotalsInc[totPath] ?? 0) + d.quantity;
      }

      await BotModel.updateOne({ userId: battle.defenderId }, { $inc: botInc });

      if (!isHeadlessWorkingBattleActive(battle.battleId)) {
        await Battle.updateOne(
          { _id: battle._id },
          {
            $push: {
              battalions: { $each: deployments.map((d) => d.battalion) },
              startingBattalions: { $each: deployments.map((d) => d.battalion) },
            },
            $inc: defenderTotalsInc,
          }
        );
      }

      try {
        const { ScreenDimensionService } = require('./ScreenDimensionService');
        ScreenDimensionService.setBattleScreenDimensions(
          battle.battleId,
          (battle as any).screenWidth,
          (battle as any).screenHeight
        );

        const { BattalionService } = require('./BattalionService');
        BattalionService.seedNewBattalionsIntoTargetingMap(
          deployments.map((d) => d.battalion),
          battle.nodes,
          battle.battleId
        );

        await AttackService.executeUnifiedRetargeting(
          battle,
          deployments.map((d) => d.battalion.id),
          'NEW_DEFENDER_DEPLOYMENT'
        );
      } catch (error) {
        console.error(`Error assigning targets to new battalions:`, error);
      }
    }
  }

  /**
   * Prepare a single battalion without updating inventory.
   * Unknown keys in `remainingBots` throw — inventory must only use Mark I / Mark II family keys.
   */
  private static async prepareSingleBattalion(
    battle: IBattleDocument,
    remainingBots: Record<string, number>,
    deploySlotIndex: number,
    defenderLevel: number,
    defenderArmyBonus?: { strength: number; defense: number; speed: number; health: number },
    defenderGuardianBonus?: { strength: number; defense: number; speed: number; health: number },
    defenderPhreakBonus?: { strength: number; defense: number; speed: number; health: number }
  ): Promise<{
    success: boolean;
    battalion?: IBattalion;
    inventoryKey?: BotInventoryKey;
    quantity?: number;
  }> {
    const availableKeys: BotInventoryKey[] = [];
    for (const [key, count] of Object.entries(remainingBots)) {
      if (typeof count !== 'number' || count <= 0) {
        continue;
      }
      const parsed = parseInventoryKeyToFamilyAndMark(key);
      if (!parsed) {
        throw new Error(
          `Defender bot inventory has unknown key "${key}" — cannot deploy PvP wave (fix Bot.bots schema or data)`
        );
      }
      availableKeys.push(key as BotInventoryKey);
    }

    if (availableKeys.length === 0) {
      return { success: false };
    }

    const headless = isHeadlessWorkingBattleActive(battle.battleId);
    const selectedKey = (() => {
      if (headless) {
        const sorted = [...availableKeys].sort((a, b) => a.localeCompare(b));
        const pick = headlessDeterministicPickIndex(
          battle.battleId,
          battleEngineNowMs(battle.battleId),
          `deploy-inv-${deploySlotIndex}`,
          sorted.length
        );
        return sorted[pick]!;
      }
      return availableKeys[Math.floor(Math.random() * availableKeys.length)]!;
    })();
    const parsed = parseInventoryKeyToFamilyAndMark(selectedKey);
    if (!parsed) {
      throw new Error(`Invariant: invalid inventory key ${selectedKey}`);
    }

    const availableCount = remainingBots[selectedKey];
    const quantity = Math.min(availableCount, MAX_DEFENDER_PER_BATTALION);
    if (quantity <= 0) {
      return { success: false };
    }

    const battalionId = this.makeDefenderBattalionId(battle, deploySlotIndex);

    const battalion = await this.createDefenderBattalion(
      battalionId,
      battle.nodes,
      parsed.family as BotType,
      quantity,
      defenderLevel,
      parsed.markLevel,
      defenderArmyBonus,
      defenderGuardianBonus,
      defenderPhreakBonus
    );

    return {
      success: true,
      battalion,
      inventoryKey: selectedKey,
      quantity,
    };
  }

  private static makeDefenderBattalionId(battle: IBattleDocument, deploySlotIndex: number): string {
    const bid = String(battle.battleId).trim();
    if (isHeadlessWorkingBattleActive(bid)) {
      const v = battleEngineNowMs(bid);
      return `defender-battalion-${bid}-${v}-${deploySlotIndex}`;
    }
    return `defender-battalion-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Create a defender battalion with proper positioning and stats
   */
  private static async createDefenderBattalion(
    battalionId: string,
    nodes: INode[],
    family: BotType,
    quantity: number,
    defenderLevel: number,
    markLevel: 1 | 2,
    defenderArmyBonus?: { strength: number; defense: number; speed: number; health: number },
    defenderGuardianBonus?: { strength: number; defense: number; speed: number; health: number },
    defenderPhreakBonus?: { strength: number; defense: number; speed: number; health: number }
  ): Promise<IBattalion> {
    return BattalionFactory.createDefenderBattalion(
      battalionId,
      family,
      quantity,
      defenderLevel,
      markLevel,
      nodes,
      defenderArmyBonus,
      defenderGuardianBonus,
      defenderPhreakBonus
    );
  }
}
