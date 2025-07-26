/**
 * @file BattalionService.ts
 * @description Battalion creation and business logic authority
 */

import { IBattalion, INode, NodeOwner, BotType, BattalionTargetingResult } from '../types/battle';
import { BOT_CONFIG } from './BotService';
import { MovementService } from './MovementService';
import { MovementState } from '../types/battle';
import { Battle } from '../models/Battle';
import { TargetingService } from './TargetingService';
import { AttackService } from './AttackService';
import { CombatService } from './CombatService';
import { ScreenDimensionService } from './ScreenDimensionService';

export class BattalionService {
  private static targetingResults: Map<string, BattalionTargetingResult[]> = new Map();

  /**
   * Trigger initial targeting for a battle and store results
   */
  static async triggerInitialTargeting(battalions: IBattalion[], nodes: INode[], battleId: string): Promise<BattalionTargetingResult[]> {
    console.log('🎯 TRIGGERING INITIAL TARGETING for battle:', battleId);
    
    // Assign initial targets to all battalions (direct call to authority)
    const results = TargetingService.assignInitialTargets(battalions, nodes);
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
   * Update targeting results for retargeted battalions (accepts RetargetingResult directly)
   */
  static async updateTargetingResults(battleId: string, retargetingResults: Array<{battalionId: string, newTargetNodeIndex: number, pathToTarget: number[]}>): Promise<void> {
    console.log(`🎯 BATTALION SERVICE: Updating targeting for ${retargetingResults.length} battalions`);
    
    // Get current targeting results
    const currentResults = this.getTargetingResults(battleId);
    
    // Update each battalion's targeting
    for (const retargetResult of retargetingResults) {
      const existingIndex = currentResults.findIndex(result => result.battalionId === retargetResult.battalionId);
      
      if (existingIndex >= 0) {
        // Update existing targeting result
        currentResults[existingIndex].targetNode = retargetResult.newTargetNodeIndex;
      } else {
        console.log(`🎯 BATTALION SERVICE WARNING: Battalion ${retargetResult.battalionId} not found in current targeting results`);
      }
    }
    
    // Store updated results
    this.targetingResults.set(battleId, currentResults);
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
   * Update battle movement for all battalions (streamlined orchestration)
   */
  static async updateBattleMovement(battleId: string): Promise<void> {
    const battle = await this.getBattle(battleId);
    const targetingResults = this.getTargetingResults(battleId);
    
    if (!battle) return;

    // Delegate movement logic to MovementService (now includes movement→attack transitions)
    await MovementService.updateBattleMovement(battleId, battle, targetingResults);
    
    // Delegate attack processing to AttackService
    await AttackService.processActiveAttacks(battle);
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

  /**
   * NEW: Enhanced position update with client sync structure (PHASE 4)
   */
  static updateBattalionPositions(battleId: string, battle: any): {
    positionUpdates: Array<{battalionId: string, oldPosition: number, newPosition: number, coordinates: {x: number, y: number}}>,
    movementUpdates: Array<{battalionId: string, movementState: MovementState}>
  } {
    const positionUpdates = [];
    const movementUpdates = [];
    
    const movementStates = MovementService.getMovementStates(battleId);
    
    for (const [battalionId, movementState] of movementStates) {
      if (movementState.movementStatus === 'arrived') {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
        if (battalion && battalion.position.nodeIndex !== movementState.targetPosition.nodeIndex) {
          const oldPosition = battalion.position.nodeIndex;
          
          // SERVER AUTHORITY: Update battalion position
          battalion.position.nodeIndex = movementState.targetPosition.nodeIndex;
          battalion.position.x = movementState.targetPosition.x;
          battalion.position.y = movementState.targetPosition.y;
          
          console.log(`🔄 SERVER POSITION: ${battalion.owner} ${battalion.type} moved ${oldPosition} → ${battalion.position.nodeIndex}`);
          
          // Prepare structured update for client
          positionUpdates.push({
            battalionId: battalion.id,
            oldPosition: oldPosition,
            newPosition: battalion.position.nodeIndex,
            coordinates: { x: battalion.position.x, y: battalion.position.y }
          });
        }
      }
      
      // Track movement state changes for client (only when actually moving)
      if (movementState.movementStatus === 'moving') {
        movementUpdates.push({
          battalionId: battalionId,
          movementState: movementState
        });
      }
    }
    
    return { positionUpdates, movementUpdates };
  }

} 