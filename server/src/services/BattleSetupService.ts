/**
 * @file BattleSetupService.ts
 * @description Battle creation and initialization logic
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, IBattalion, INode, BotType } from '../types/battle';
import { createNodesWithTugOfWar } from '../services/NodeService';
import { BattalionService } from './BattalionService';
import { PointTrackingService } from './PointTrackingService';
import { BotService } from './BotService';
import { NPCService } from './NPCService';
import { Map as MapModel } from '../models/Map';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { BattleInventorySettlementService } from './BattleInventorySettlementService';

export class BattleSetupService {

  static async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number, userBattalions?: Array<{type: string, quantity: number}>, defenderNpcSlug?: string, unlockHackRigOnWin?: boolean, defenderNpcInstanceId?: string): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get user level for bot stat calculations
    let userLevel = 1;
    if (attackerId !== 'computer-opponent') {
      try {
        const user = await User.findById(attackerId);
        userLevel = user?.level || 1;
      } catch (error) {
        console.warn('Could not fetch user level, using default level 1:', error);
      }
    }
    
    // Calculate total army health based on expected battalion configurations
    const defaultUserBattalions = [
      { type: BotType.GUARDIAN, quantity: 10 },
      { type: BotType.BREACHER, quantity: 8 },
      { type: BotType.PHREAK, quantity: 6 },
    ];
    const defaultEnemyBattalions = [
      { type: BotType.GUARDIAN, quantity: 12 },
      { type: BotType.BREACHER, quantity: 10 },
      { type: BotType.PHREAK, quantity: 8 },
    ];
    
    const battalionConfigs = userBattalions || defaultUserBattalions;
    
    // Check if defender is a user (not NPC)
    // A user defender is when we have a defenderId that's not 'computer-opponent' and doesn't look like an NPC ID
    const isUserDefender = defenderId !== 'computer-opponent' && 
                          !defenderId.startsWith('npc-') && 
                          !defenderId.startsWith('computer');
    
    
    // Validate defender inventory for user-vs-user battles
    if (isUserDefender) {
      const inventoryValidation = await BattleInventorySettlementService.validateDefenderInventory(defenderId);
      if (!inventoryValidation.valid) {
        console.warn(`Defender ${defenderId} has no bots available for defense: ${inventoryValidation.error}`);
        // Don't throw error - allow battle to start but defender won't be able to deploy
      }
    }
    
    // Optionally load NPC for enemy side (only for NPC battles)
    const npc = !isUserDefender && defenderNpcSlug ? await NPCService.getNPCBySlug(defenderNpcSlug) : null;
    
    // Validate that NPC instance exists on map if instance ID is provided (only for NPC battles)
    if (!isUserDefender && defenderNpcInstanceId && defenderNpcSlug) {
      const mapDoc = await MapModel.findOne({ name: 'main' });
      if (!mapDoc) {
        throw new Error('Map not found');
      }
      
      const npcCell = mapDoc.cells.find((cell: any) => 
        cell.npcInstanceId === defenderNpcInstanceId && 
        cell.npcSlug === defenderNpcSlug &&
        cell.isOccupied && 
        cell.occupiedBy === 'npc'
      );
      
      if (!npcCell) {
        throw new Error(`NPC instance ${defenderNpcInstanceId} not found on map`);
      }
    }
    
    // Calculate total army health using new BotService
    let userTotal = 0;
    for (const battalion of battalionConfigs) {
      const botType = battalion.type as BotType;
      const botConfig = await BotService.getUserBotStats(botType, userLevel);
      userTotal += botConfig.stats.health * battalion.quantity;
    }
    
    let enemyTotal = 0;
    if (isUserDefender) {
      // For user defenders, calculate total health based on their inventory and level
      try {
        const defender = await User.findById(defenderId);
        if (!defender) {
          throw new Error(`Defender user ${defenderId} not found`);
        }
        
        const defenderLevel = defender.level || 1;
        const BotModel = mongoose.model('Bot');
        const defenderBots = await BotModel.findOne({ userId: defenderId });
        
        // Calculate total health for all available bots in defender's inventory
        if (defenderBots && defenderBots.bots) {
          for (const [botType, quantity] of Object.entries(defenderBots.bots)) {
            if (typeof quantity === 'number' && quantity > 0) {
              const botConfig = await BotService.getUserBotStats(botType as BotType, defenderLevel);
              enemyTotal += botConfig.stats.health * quantity;
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch defender inventory, using default enemy total:', error);
        // Fallback to default enemy total if defender data can't be fetched
        for (const battalion of defaultEnemyBattalions) {
          const botType = battalion.type as BotType;
          const botConfig = await BotService.getEnemyBotStats(botType, userLevel);
          enemyTotal += botConfig.stats.health * battalion.quantity;
        }
      }
    } else if (npc) {
      // Use NPC's userLevelAssociation for bot stat scaling instead of statMultipliers
      const npcLevel = npc.userLevelAssociation || 1;
      for (const battalion of npc.battalions) {
        const validatedType = BattalionService.validateEnemyBotType(battalion.type);
        const botConfig = await BotService.getEnemyBotStats(validatedType, npcLevel);
        enemyTotal += botConfig.stats.health * battalion.quantity;
      }
    } else {
      for (const battalion of defaultEnemyBattalions) {
        const botType = battalion.type as BotType;
        const botConfig = await BotService.getEnemyBotStats(botType, userLevel);
        enemyTotal += botConfig.stats.health * battalion.quantity;
      }
    }
    
    const totalArmyHealth = userTotal + enemyTotal;
    
    // Now create nodes with the correct total army health
    const nodes = createNodesWithTugOfWar(totalArmyHealth, screenWidth, screenHeight);
    
    const userBattalionsList = await BattalionService.createUserBattalions(nodes, userLevel, userBattalions);

    let enemyBattalions: IBattalion[];
    if (isUserDefender) {
      // For user defenders, don't create enemy battalions upfront - they'll be spawned in waves
      enemyBattalions = [];
    } else if (npc) {
      // Pass NPC level for proper bot stat scaling
      const npcLevel = npc.userLevelAssociation || 1;
      enemyBattalions = await BattalionService.createEnemyBattalionsFromNPC(nodes, npcLevel, {
        battalions: npc.battalions as any,
        statMultipliers: { health: 1, speed: 1, offense: 1, defense: 1, range: 1 }, // Legacy parameter, not used
      });
    } else {
      enemyBattalions = await BattalionService.createEnemyBattalions(nodes, userLevel);
    }
    const battalions = [...userBattalionsList, ...enemyBattalions];
    
    // Store starting battalion states for loss tracking
    // For user defenders, only track attacker battalions initially since defender battalions spawn in waves
    const startingBattalions = battalions.map(battalion => ({
      ...battalion,
      id: battalion.id,
      quantity: battalion.quantity,
      currentHealth: battalion.currentHealth,
      isDestroyed: false
    }));

    const battle = new Battle({
      battleId,
      attackerId,
      defenderId,
      phase: BattlePhase.COUNTDOWN,
      countdown: 3,
      battleTime: 0,
      startingBattalions,
      battalions,
      nodes,
      winner: null,
      startTime: new Date(),
      endTime: null,
      screenWidth,
      screenHeight,
      ...(unlockHackRigOnWin ? { unlockHackRigOnWin: true } as any : {}),
      ...(defenderNpcSlug ? { defenderNpcSlug } as any : {}),
      ...(defenderNpcInstanceId ? { defenderNpcInstanceId } as any : {}),
      ...(isUserDefender ? { 
        isUserDefender: true,
        defenderDeployedTotals: { guardian: 0, breacher: 0, phreak: 0 },
        defenderDeploymentExhausted: false,
        lastTickProcessed: 0
      } as any : {}),
    });

    return await battle.save();
  }
} 