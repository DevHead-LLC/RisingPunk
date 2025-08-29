/**
 * @file BattalionFactory.ts
 * @description Centralized battalion object construction for consistent battalion creation across services
 */

import { IBattalion, BotType, NodeOwner } from '../types/battle';
import { INode } from '../types/battle';

export class BattalionFactory {
  
  /**
   * Create a battalion with consistent structure and validation
   */
  static createBattalion(
    id: string,
    type: BotType,
    quantity: number,
    nodeIndex: number,
    owner: NodeOwner,
    stats: any,
    nodes: INode[]
  ): IBattalion {
    const maxHealth = stats.health * quantity;
    const node = nodes[nodeIndex];
    
    if (!node) {
      throw new Error(`Node index ${nodeIndex} not found in nodes array`);
    }
        
    return {
      id,
      type,
      quantity,
      currentHealth: maxHealth,
      maxHealth,
      baseHealthPerUnit: stats.health,
      isDestroyed: false,
      position: {
        x: node.position.x,
        y: node.position.y,
        nodeIndex,
      },
      owner,
      stats,
      mark: 1,
    };
  }

  /**
   * Create a defender battalion with proper positioning and stats
   * Used by DefenderDeploymentService for wave spawning
   */
  static async createDefenderBattalion(
    id: string,
    type: BotType,
    quantity: number,
    defenderLevel: number,
    nodes: INode[]
  ): Promise<IBattalion> {
    // Find all suitable spawn nodes (enemy-owned nodes)
    const enemyNodes = nodes.filter(node => node.owner === 'enemy');
    if (enemyNodes.length === 0) {
      throw new Error('No enemy spawn nodes found for defender battalion');
    }

    // Randomly select a spawn node for variety
    const randomIndex = Math.floor(Math.random() * enemyNodes.length);
    const spawnNode = enemyNodes[randomIndex];

    // Get actual bot stats from database for this specific bot type
    const BotService = require('./BotService').BotService;
    const botConfig = await BotService.getUserBotStats(type, defenderLevel);
    
    if (!botConfig || !botConfig.stats) {
      throw new Error(`No bot stats found for type: ${type} at level ${defenderLevel}`);
    }

    // Use the computed effective stats (already scaled for the defender's level)
    const stats = {
      health: botConfig.stats.health,
      speed: botConfig.stats.speed,
      range: botConfig.stats.range,
      offense: botConfig.stats.offense,
      defense: botConfig.stats.defense
    };

    console.log(`BattalionFactory: Created ${type} battalion at node ${spawnNode.index} for level ${defenderLevel} defender`);
    console.log(`BattalionFactory: ${type} effective stats:`, stats);

    return this.createBattalion(
      id,
      type,
      quantity,
      spawnNode.index,
      NodeOwner.ENEMY,
      stats,
      nodes
    );
  }
}
