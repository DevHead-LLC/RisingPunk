/**
 * @file BattalionService.ts
 * @description Battalion creation and business logic authority
 */

import { NodeOwner, BotType, IBattalion, INode } from '../types/battle';
import { BOT_CONFIG } from './BotService';
import { NETWORK_CONNECTIONS } from '../config/networkConfig';

export interface BattalionTargetingResult {
  battalionId: string;
  battalionType: BotType;
  battalionOwner: NodeOwner;
  startingNode: number;
  targetNode: number;
  isValidTarget: boolean;
  reason?: string;
}

export class BattalionService {
  /**
   * Calculate total army health from all battalions
   */
  static calculateTotalArmyHealth(battalions: IBattalion[]): number {
    return battalions.reduce((total, battalion) => {
      return total + (battalion.stats.health * battalion.quantity);
    }, 0);
  }

  /**
   * Create user battalions with proper stats
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
      const stats = BOT_CONFIG.USER_BOT_STATS[battalion.type].stats;
      const maxHealth = stats.health * battalion.quantity;
      
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
      const stats = BOT_CONFIG.ENEMY_BOT_STATS[battalion.type].stats;
      const maxHealth = stats.health * battalion.quantity;
      
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
   * Assign a random valid target to a single battalion
   */
  static assignTargetToBattalion(
    battalion: IBattalion, 
    neutralNodeIndices: number[], 
    ownerLabel: string
  ): BattalionTargetingResult {
    const startingNode = battalion.position.nodeIndex;
    const validTargets = this.getValidTargets(startingNode, neutralNodeIndices);
    
    if (validTargets.length === 0) {
      console.log(`❌ ${ownerLabel} ${battalion.type} at node ${startingNode}: NO VALID TARGETS`);
      return {
        battalionId: battalion.id,
        battalionType: battalion.type,
        battalionOwner: battalion.owner,
        startingNode,
        targetNode: -1,
        isValidTarget: false,
        reason: 'No valid targets reachable via network'
      };
    }
    
    // Select random target from valid options
    const randomIndex = Math.floor(Math.random() * validTargets.length);
    const targetNode = validTargets[randomIndex];
    
    console.log(`✅ ${ownerLabel} ${battalion.type} at node ${startingNode} targets node ${targetNode}`);
    
    return {
      battalionId: battalion.id,
      battalionType: battalion.type,
      battalionOwner: battalion.owner,
      startingNode,
      targetNode,
      isValidTarget: true
    };
  }
  
  /**
   * Get valid neutral node targets reachable from starting node via network
   */
  private static getValidTargets(startingNode: number, neutralNodeIndices: number[]): number[] {
    return neutralNodeIndices.filter(targetNode => 
      this.isReachableViaNetwork(startingNode, targetNode)
    );
  }
  
  /**
   * Check if target node is reachable from starting node via DIRECT network connections only
   */
  static isReachableViaNetwork(startingNode: number, targetNode: number): boolean {
    // Direct connection check only - no 1-hop paths for initial targeting
    return NETWORK_CONNECTIONS.some(connection => 
      (connection.from === startingNode && connection.to === targetNode) ||
      (connection.from === targetNode && connection.to === startingNode)
    );
  }
} 