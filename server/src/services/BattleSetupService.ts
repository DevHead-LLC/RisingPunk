/**
 * @file BattleSetupService.ts
 * @description Battle creation and initialization logic
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, IBattalion, INode } from '../types/battle';
import { createNodesWithTugOfWar } from '../services/NodeService';
import { BattalionService } from './BattalionService';

export class BattleSetupService {

  static async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const nodes = createNodesWithTugOfWar(0, screenWidth, screenHeight);
    
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);
    const battalions = [...userBattalions, ...enemyBattalions];
    
    const totalArmyHealth = BattalionService.calculateTotalArmyHealth(battalions);
    
    nodes.forEach(node => {
      node.maxCaptureThreshold = totalArmyHealth;
    });
    
    const battle = new Battle({
      battleId,
      attackerId,
      defenderId,
      phase: BattlePhase.COUNTDOWN,
      countdown: 3,
      battleTime: 0,
      battalions,
      nodes,
      winner: null,
      startTime: new Date(),
      endTime: null,
    });

    return await battle.save();
  }
} 