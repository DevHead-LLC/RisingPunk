/**
 * @file BattleSetupService.ts
 * @description Battle creation and initialization logic (extracted from BattleService.ts)
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, IBattalion, INode } from '../types/battle';
import { createNodesWithTugOfWar } from '../services/NodeService';
import { BattalionService } from './BattalionService';

export class BattleSetupService {

  /**
   * Create a new battle with initial setup
   * REUSE: Existing battle creation pattern
   */
  static async createBattle(attackerId: string, defenderId: string, screenWidth: number, screenHeight: number): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create real nodes first with placeholder totalArmyHealth
    const nodes = createNodesWithTugOfWar(0, screenWidth, screenHeight);
    
    // Create battalions using real nodes
    const userBattalions = BattalionService.createUserBattalions(nodes);
    const enemyBattalions = BattalionService.createEnemyBattalions(nodes);
    const battalions = [...userBattalions, ...enemyBattalions];
    
    // Calculate total army health for tug-of-war threshold
    const totalArmyHealth = BattalionService.calculateTotalArmyHealth(battalions);
    
    // Update nodes with proper tug-of-war initialization
    nodes.forEach(node => {
      node.maxCaptureThreshold = totalArmyHealth;
    });
    
    // Create battle with proper phase setup
    const battle = new Battle({
      battleId,
      attackerId,
      defenderId,
      phase: BattlePhase.COUNTDOWN, // Start in countdown phase
      countdown: 3, // 3-second countdown as per intentions
      battleTime: 0,

      battalions,
      nodes,
      winner: null,
      startTime: new Date(),
      endTime: null,
    });

    // Save battle to database
    return await battle.save();
  }
} 