/**
 * @file BattleSetupService.ts
 * @description Battle creation and initialization logic
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, IBattalion, INode, BotType } from '../types/battle';
import { createNodesWithTugOfWar } from '../services/NodeService';
import { BattalionService } from './BattalionService';
import { PointTrackingService } from './PointTrackingService';

export class BattleSetupService {

  static async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number, userBattalions?: Array<{type: string, quantity: number}>): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
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
    const allBattalionConfigs = [...battalionConfigs, ...defaultEnemyBattalions];
    
    // Calculate total army health using bot stats
    const BOT_CONFIG = {
      USER_BOT_STATS: {
        guardian: { health: 14, speed: 9, range: 4, offense: 8, defense: 6 },
        breacher: { health: 18, speed: 5, range: 5, offense: 7, defense: 8 },
        phreak: { health: 12, speed: 7, range: 9, offense: 6, defense: 5 }
      },
      ENEMY_BOT_STATS: {
        guardian: { health: 12, speed: 8, range: 3, offense: 7, defense: 5 },
        breacher: { health: 16, speed: 4, range: 4, offense: 6, defense: 7 },
        phreak: { health: 10, speed: 6, range: 8, offense: 5, defense: 4 }
      }
    };
    
    const totalArmyHealth = allBattalionConfigs.reduce((total, battalion) => {
      const botType = battalion.type as BotType;
      const stats = BOT_CONFIG.USER_BOT_STATS[botType];
      return total + (stats.health * battalion.quantity);
    }, 0);
    
    // Now create nodes with the correct total army health
    const nodes = createNodesWithTugOfWar(totalArmyHealth, screenWidth, screenHeight);
    
    const userBattalionsList = BattalionService.createUserBattalions(nodes, userBattalions);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);
    const battalions = [...userBattalionsList, ...enemyBattalions];
    
    // Store starting battalion states for loss tracking
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
    });

    return await battle.save();
  }
} 