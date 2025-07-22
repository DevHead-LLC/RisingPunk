/**
 * @file BattleSetupService.ts
 * @description Battle creation and initialization logic (extracted from BattleService.ts)
 */

import { Battle, IBattleDocument } from '../models/Battle';
import { BattlePhase, NodeOwner, BotType, IBattalion, INode } from '../types/battle';
import { BATTLE_CONFIG } from '../config/battleConfig';
import { calculateBattalionHealth } from '../utils/battleUtils';

// Bot stats from battleConfig (single source of truth)
const BOT_CATEGORIES = BATTLE_CONFIG.BOT_STATS;
const ENEMY_BOT_CATEGORIES = BATTLE_CONFIG.ENEMY_BOT_STATS;

export class BattleSetupService {
  /**
   * Calculate total army health from all battalions
   * REUSE: calculateBattalionHealth() utility
   */
  static calculateTotalArmyHealth(battalions: IBattalion[]): number {
    return battalions.reduce((total, battalion) => {
      return total + calculateBattalionHealth(battalion.stats.health, battalion.quantity);
    }, 0);
  }

  /**
   * Create nodes with tug-of-war system
   * USER REQUIREMENT: 100% of total army health (not 75%)
   */
  static createNodesWithTugOfWar(totalArmyHealth: number): INode[] {
    // Initialize nodes with server-calculated positions (moved from client for security)
    // Use standard screen dimensions for positioning (client will scale if needed)
    const positionedNodes = BATTLE_CONFIG.calculateNodePositions(
      BATTLE_CONFIG.STANDARD_SCREEN_WIDTH, 
      BATTLE_CONFIG.STANDARD_SCREEN_HEIGHT, 
      125
    );
    
    return positionedNodes.map((nodeTemplate) => {
      return {
        index: nodeTemplate.index,
        position: nodeTemplate.position, // Server-calculated position
        owner: nodeTemplate.owner === 'user' ? NodeOwner.USER : 
               nodeTemplate.owner === 'enemy' ? NodeOwner.ENEMY : NodeOwner.NEUTRAL,
        tugOfWarProgress: 0,        // USER REQUIREMENT: Start at 0
        maxCaptureThreshold: totalArmyHealth, // USER REQUIREMENT: Total army health (for damage calculation)
      };
    });
  }

  /**
   * Create user battalions with proper stats
   * REUSE: BATTLE_CONFIG.BOT_STATS pattern
   */
  static createUserBattalions(nodes: INode[]): IBattalion[] {
    const battalions: IBattalion[] = [];
    
    // User battalions on nodes 0, 1, 2
    const userBattalions = [
      { type: 'guardian' as BotType, quantity: 10, nodeIndex: 0 },
      { type: 'breacher' as BotType, quantity: 8, nodeIndex: 1 },
      { type: 'phreak' as BotType, quantity: 6, nodeIndex: 2 },
    ];
    
    userBattalions.forEach((battalion, index) => {
      const stats = BOT_CATEGORIES[battalion.type].stats;
      const maxHealth = calculateBattalionHealth(stats.health, battalion.quantity);
      
      battalions.push({
        id: `user-battalion-${index}`,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: maxHealth,
        maxHealth,
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.USER,
        stats,
        mark: 1,
      });
    });

    return battalions;
  }

  /**
   * Create enemy battalions with proper stats
   * REUSE: BATTLE_CONFIG.ENEMY_BOT_STATS pattern
   */
  static createEnemyBattalions(nodes: INode[]): IBattalion[] {
    const battalions: IBattalion[] = [];
    
    // Enemy battalions on nodes 6, 7, 8
    const enemyBattalions = [
      { type: 'guardian' as BotType, quantity: 8, nodeIndex: 6 },
      { type: 'breacher' as BotType, quantity: 10, nodeIndex: 7 },
      { type: 'phreak' as BotType, quantity: 7, nodeIndex: 8 },
    ];
    
    enemyBattalions.forEach((battalion, index) => {
      const stats = ENEMY_BOT_CATEGORIES[battalion.type].stats;
      const maxHealth = calculateBattalionHealth(stats.health, battalion.quantity);
      
      battalions.push({
        id: `enemy-battalion-${index}`,
        type: battalion.type,
        quantity: battalion.quantity,
        currentHealth: maxHealth,
        maxHealth,
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.ENEMY,
        stats,
        mark: 1,
      });
    });

    return battalions;
  }

  /**
   * Create a new battle with initial setup
   * REUSE: Existing battle creation pattern
   */
  static async createBattle(attackerId: string, defenderId: string): Promise<IBattleDocument> {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create all battalions first to calculate total army health
    const tempNodes = this.createNodesWithTugOfWar(0); // Temporary nodes for battalion positioning
    const userBattalions = this.createUserBattalions(tempNodes);
    const enemyBattalions = this.createEnemyBattalions(tempNodes);
    const battalions = [...userBattalions, ...enemyBattalions];
    
    // Calculate total army health for tug-of-war threshold
    const totalArmyHealth = this.calculateTotalArmyHealth(battalions);
    
    // Create nodes with proper tug-of-war initialization
    const nodes = this.createNodesWithTugOfWar(totalArmyHealth);
    
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