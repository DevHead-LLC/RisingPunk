/**
 * @file BattalionService.ts
 * @description Battalion creation and business logic authority
 */

import { IBattalion, INode, NodeOwner, BotType } from '../types/battle';
import { BOT_CONFIG } from './BotService';
import { MovementService } from './MovementService';
import { MovementState } from '../../../mobile/src/types/battleTypes';
import { Battle } from '../models/Battle';
import { TargetingService } from './TargetingService';

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
  private static targetingResults: Map<string, BattalionTargetingResult[]> = new Map();

  /**
   * Trigger initial targeting for a battle and store results
   */
  static async triggerInitialTargeting(battalions: IBattalion[], nodes: INode[], battleId: string): Promise<BattalionTargetingResult[]> {
    console.log('🎯 TRIGGERING INITIAL TARGETING for battle:', battleId);
    
    // Assign initial targets to all battalions
    const results = this.assignInitialTargets(battalions, nodes);
    this.targetingResults.set(battleId, results);
    
    return results;
  }

  /**
   * Get current targeting results for a specific battle
   */
  static getTargetingResults(battleId?: string): BattalionTargetingResult[] {
    if (!battleId) {
      return [];
    }
    return this.targetingResults.get(battleId) || [];
  }

  /**
   * Clear targeting results for a battle (cleanup)
   */
  static clearTargetingResults(battleId: string): void {
    this.targetingResults.delete(battleId);
  }

  /**
   * Get battle by ID
   */
  static async getBattle(battleId: string): Promise<any> {
    return Battle.findOne({ battleId });
  }

  /**
   * Get current movement states for a specific battle
   */
  static getMovementStates(battleId: string): Map<string, MovementState> {
    return MovementService.getMovementStates(battleId);
  }

  /**
   * Store screen dimensions for a battle (called when client requests battle state)
   */
  static setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    MovementService.setBattleScreenDimensions(battleId, width, height);
  }

  /**
   * Get screen dimensions for a battle (for movement calculations)
   */
  static getBattleScreenDimensions(battleId: string): { width: number; height: number } {
    return MovementService.getBattleScreenDimensions(battleId);
  }

  /**
   * Start smooth movement updates (separate from timer) at 100ms intervals
   */
  static startMovementUpdates(battleId: string): void {
    MovementService.startMovementUpdates(battleId, async (battleId: string) => {
      await this.updateBattleMovement(battleId);
    });
  }

  /**
   * Stop movement updates for a battle
   */
  static stopMovementUpdates(battleId: string): void {
    MovementService.stopMovementUpdates(battleId);
  }

  /**
   * Update battle movement for all battalions (orchestration)
   */
  static async updateBattleMovement(battleId: string): Promise<void> {
    const battle = await this.getBattle(battleId);
    const targetingResults = this.getTargetingResults(battleId);
    
    if (!battle || targetingResults.length === 0) return;

    // Delegate movement logic to MovementService
    await MovementService.updateBattleMovement(battleId, battle, targetingResults);
    
    // Delegate attack processing to MovementService
    await MovementService.processActiveAttacks(battle);
  }

  /**
   * Assign initial random targets to all battalions
   */
  private static assignInitialTargets(battalions: IBattalion[], nodes: INode[]): BattalionTargetingResult[] {
    return TargetingService.assignInitialTargets(battalions, nodes);
  }

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


} 