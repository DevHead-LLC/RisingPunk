/**
 * @file DefenderDeploymentService.ts
 * @description Handles wave-based deployment of defender battalions in user-vs-user battles
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BotType, IBattalion, INode, NodeOwner } from '../types/battle';
import { BattalionService } from './BattalionService';
import { BotService } from './BotService';
import { BattalionFactory } from './BattalionFactory';
import { RetargetingService } from './RetargetingService';
import { AttackService } from './AttackService';
import mongoose from 'mongoose';

// Safety constants for defender deployment
const MAX_DEFENDER_PER_BATTALION = 250000;
const MAX_DEFENDER_BATTALIONS_PER_SECOND = 6;
const MIN_BATTLE_TIME_FOR_DEPLOYMENT = 0; // Start deploying immediately
const MAX_BATTLE_TIME_FOR_DEPLOYMENT = 45; // Stop deploying at battle end

export class DefenderDeploymentService {
  
  /**
   * Process a battle tick for defender deployment
   * Called once per second during active battle phase
   */
  static async onTick(battleId: string): Promise<void> {
    try {
      const battle = await Battle.findOne({ battleId });
      if (!battle) {
        return;
      }

      // Only process user defender battles
      if (!battle.isUserDefender) {
        return;
      }

      // Don't deploy if battle is over or deployment is exhausted
      if (battle.phase === 'complete' || battle.defenderDeploymentExhausted) {
        return;
      }

      // Allow first wave deployment during countdown phase
      const isFirstWave = !battle.defenderDeployedTotals || 
                         (battle.defenderDeployedTotals.guardian === 0 && 
                          battle.defenderDeployedTotals.breacher === 0 && 
                          battle.defenderDeployedTotals.phreak === 0);

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
      
      // Mark this tick as processed using atomic update to avoid version conflicts
      await Battle.updateOne(
        { _id: battle._id },
        { 
          $set: { lastTickProcessed: battle.battleTime },
          $setOnInsert: {
            defenderDeployedTotals: { guardian: 0, breacher: 0, phreak: 0 },
            startingBattalions: []
          }
        }
      );
      
    } catch (error) {
    }
  }

  /**
   * Deploy a wave of up to 6 battalions
   */
  private static async deployWave(battle: IBattleDocument): Promise<void> {
    try {
      // Get defender's current bot inventory using proper model reference
      const BotModel = mongoose.model('Bot');
      const defenderBots = await BotModel.findOne({ userId: battle.defenderId });
      if (!defenderBots || !defenderBots.bots) {
        return;
      }
      

      // Get defender's level for bot stat scaling
      const UserModel = mongoose.model('User');
      const defender = await UserModel.findById(battle.defenderId);
      const defenderLevel = defender?.level || 1;

      // Check if we have any bots left to deploy
      const totalAvailable = Object.values(defenderBots.bots).reduce((sum: number, count: any) => sum + (count || 0), 0);
      if (totalAvailable === 0) {
        battle.defenderDeploymentExhausted = true;
        await battle.save();
        return;
      }

      // Calculate how many battalions we can deploy this tick
      // We want to deploy ALL available bots, up to 6 battalions per second
      const maxBattalionsThisTick = Math.min(MAX_DEFENDER_BATTALIONS_PER_SECOND, totalAvailable);
      

      // Prepare all deployments first without updating inventory
      const deployments: Array<{ battalion: IBattalion; botType: string; quantity: number }> = [];
      let remainingBots = { ...defenderBots.bots };
      
      for (let i = 0; i < maxBattalionsThisTick; i++) {
        const deploymentResult = await this.prepareSingleBattalion(battle, remainingBots, defenderLevel);
        
        if (deploymentResult.success && deploymentResult.battalion && deploymentResult.botType && deploymentResult.quantity) {
          deployments.push({
            battalion: deploymentResult.battalion,
            botType: deploymentResult.botType,
            quantity: deploymentResult.quantity
          });
          
          // Update our local copy of remaining bots for next iteration
          remainingBots[deploymentResult.botType as keyof typeof remainingBots] -= deploymentResult.quantity;
        } else {
          // No more bots available
          break;
        }
      }

      // Now deploy all battalions simultaneously and update inventory
      if (deployments.length > 0) {
        for (const deployment of deployments) {
          // Update deployed totals
          if (battle.defenderDeployedTotals && 
              (deployment.botType === 'guardian' || deployment.botType === 'breacher' || deployment.botType === 'phreak')) {
            battle.defenderDeployedTotals[deployment.botType] += deployment.quantity;
          }
          
          // Add battalion to battle
          battle.battalions.push(deployment.battalion);
          if (battle.startingBattalions) {
            battle.startingBattalions.push(deployment.battalion);
          }
        }

        // Update inventory once after all deployments
        await BotModel.updateOne(
          { userId: battle.defenderId },
          { $inc: { 
            'bots.guardian': -(deployments.filter(d => d.botType === 'guardian').reduce((sum, d) => sum + d.quantity, 0)),
            'bots.breacher': -(deployments.filter(d => d.botType === 'breacher').reduce((sum, d) => sum + d.quantity, 0)),
            'bots.phreak': -(deployments.filter(d => d.botType === 'phreak').reduce((sum, d) => sum + d.quantity, 0))
          }}
        );
      }

      // Use atomic update to avoid version conflicts
      await Battle.updateOne(
        { _id: battle._id },
        { 
          $push: { 
            battalions: { $each: deployments.map(d => d.battalion) },
            startingBattalions: { $each: deployments.map(d => d.battalion) }
          },
          $inc: {
            'defenderDeployedTotals.guardian': deployments.filter(d => d.botType === 'guardian').reduce((sum, d) => sum + d.quantity, 0),
            'defenderDeployedTotals.breacher': deployments.filter(d => d.botType === 'breacher').reduce((sum, d) => sum + d.quantity, 0),
            'defenderDeployedTotals.phreak': deployments.filter(d => d.botType === 'phreak').reduce((sum, d) => sum + d.quantity, 0)
          }
        }
      );
      
      // Enable retargeting for newly deployed battalions
      if (deployments.length > 0) {
        console.log(`🎯 Deployed ${deployments.length} defender battalions (enabling retargeting for new battalions)`);
        
        // Add detailed logging to understand what happens with subsequent waves
        console.log(`🔍 SUBSEQUENT WAVE DEBUG: Deployed ${deployments.length} battalions`);
        console.log(`🔍 SUBSEQUENT WAVE DEBUG: Total battalions in battle: ${battle.battalions.length}`);
        console.log(`🔍 SUBSEQUENT WAVE DEBUG: Existing targeting results: ${BattalionService.getTargetingResults(battle.battleId).length}`);
        
        // Check if user battalion has targeting
        const userBattalion = battle.battalions.find(b => b.owner === 'user');
        if (userBattalion) {
          const userTargeting = BattalionService.getTargetingResultForBattalion(userBattalion.id, battle.battleId);
          console.log(`🔍 SUBSEQUENT WAVE DEBUG: User battalion targeting:`, userTargeting ? {
            targetType: userTargeting.targetType,
            targetNode: userTargeting.targetNode,
            isValidTarget: userTargeting.isValidTarget
          } : 'No targeting found');
        }
        
        // Enable retargeting for newly deployed battalions
        try {
          const { AttackService } = require('./AttackService');
          await AttackService.executeUnifiedRetargeting(battle, deployments.map(d => d.battalion.id), 'NEW_DEPLOYMENT');
          console.log(`🎯 Assigned targets to ${deployments.length} newly deployed defender battalions`);
        } catch (error) {
          console.error(`❌ Error assigning targets to new battalions:`, error);
        }
      }
      
    } catch (error) {
      console.error(`DefenderDeploymentService deployWave error:`, error);
    }
  }

  /**
   * Prepare a single battalion without updating inventory
   */
  private static async prepareSingleBattalion(
    battle: IBattleDocument, 
    remainingBots: any, 
    defenderLevel: number
  ): Promise<{ success: boolean; battalion?: IBattalion; botType?: 'guardian' | 'breacher' | 'phreak'; quantity?: number }> {
    try {
      // Find available bot types with remaining quantities
      const availableTypes: string[] = [];
      for (const [botType, count] of Object.entries(remainingBots)) {
        if (typeof count === 'number' && count > 0) {
          availableTypes.push(botType);
        }
      }

      if (availableTypes.length === 0) {
        return { success: false };
      }

      // Randomly select a bot type
      const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      const availableCount = remainingBots[selectedType];
      
      // Calculate quantity for this battalion (up to 250k cap)
      const quantity = Math.min(availableCount, MAX_DEFENDER_PER_BATTALION);
      
      if (quantity <= 0) {
        return { success: false };
      }

      // Create the battalion (don't update inventory yet)
      const battalion = await this.createDefenderBattalion(
        battle.nodes,
        selectedType as BotType,
        quantity,
        defenderLevel
      );

      return {
        success: true,
        battalion,
        botType: selectedType as 'guardian' | 'breacher' | 'phreak',
        quantity
      };

    } catch (error) {
      console.error(`DefenderDeploymentService prepareSingleBattalion error:`, error);
      return { success: false };
    }
  }

  /**
   * Create a defender battalion with proper positioning and stats
   */
  private static async createDefenderBattalion(
    nodes: INode[],
    botType: BotType,
    quantity: number,
    defenderLevel: number
  ): Promise<IBattalion> {
    // Generate unique battalion ID
    const battalionId = `defender-battalion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create battalion using the centralized factory
    return BattalionFactory.createDefenderBattalion(
      battalionId,
      botType,
      quantity,
      defenderLevel,
      nodes
    );
  }

}
