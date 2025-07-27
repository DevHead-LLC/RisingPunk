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
   * PHASE 2 EXTENSION: Now stores targetType for attack target determination
   * PHASE 4 EXTENSION: Now stores targetBattalionId for specific battalion targeting
   */
  static async updateTargetingResults(battleId: string, retargetingResults: Array<{battalionId: string, newTargetNodeIndex: number, pathToTarget: number[], targetType?: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string}>): Promise<void> {
    console.log(`🎯 BATTALION SERVICE: Updating targeting for ${retargetingResults.length} battalions`);
    
    // Get current targeting results
    const currentResults = this.getTargetingResults(battleId);
    
    // Update each battalion's targeting
    for (const retargetResult of retargetingResults) {
      const existingIndex = currentResults.findIndex(result => result.battalionId === retargetResult.battalionId);
      
      if (existingIndex >= 0) {
        // Update existing targeting result with new target, type, and specific battalion information
        currentResults[existingIndex].targetNode = retargetResult.newTargetNodeIndex;
        currentResults[existingIndex].targetType = retargetResult.targetType; // Store what type to attack
        currentResults[existingIndex].targetBattalionId = retargetResult.targetBattalionId; // PHASE 4: Store which specific battalion to attack
        
        // Enhanced logging for Phase 4 - show specific target details
        if (retargetResult.targetType === 'enemy_battalion') {
          console.log(`🎯 TARGETING UPDATE: Battalion ${retargetResult.battalionId} now targeting ${retargetResult.targetType} ${retargetResult.targetBattalionId} at node ${retargetResult.newTargetNodeIndex}`);
        } else {
          console.log(`🎯 TARGETING UPDATE: Battalion ${retargetResult.battalionId} now targeting ${retargetResult.targetType} at node ${retargetResult.newTargetNodeIndex}`);
        }
      } else {
        console.log(`🎯 BATTALION SERVICE WARNING: Battalion ${retargetResult.battalionId} not found in current targeting results`);
      }
    }
    
    // Store updated results
    this.targetingResults.set(battleId, currentResults);
  }

  /**
   * Get targeting result for a specific battalion
   * PHASE 2 NEW METHOD: Used by MovementService to determine attack target type on arrival
   */
  static getTargetingResultForBattalion(battalionId: string, battleId?: string): BattalionTargetingResult | null {
    // Use current battle if no battleId provided (for convenience)
    const targetingResults = this.getTargetingResults(battleId);
    
    // Find the targeting result for this specific battalion
    const result = targetingResults.find(result => result.battalionId === battalionId);
    
    if (result) {
      console.log(`🎯 TARGETING LOOKUP: Battalion ${battalionId} is targeting ${result.targetType || 'unknown'} at node ${result.targetNode}`);
      return result;
    } else {
      console.log(`🎯 TARGETING LOOKUP: No targeting result found for battalion ${battalionId}`);
      return null;
    }
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
   * FIXED: Added battle end check to prevent movement processing after battle ends
   */
  static async updateBattleMovement(battleId: string): Promise<void> {
    const battle = await this.getBattle(battleId);
    const targetingResults = this.getTargetingResults(battleId);
    
    if (!battle) return;

    // FIXED: Check if battle has ended - don't process movement after battle end
    if (battle.phase === 'COMPLETE') {
      console.log(`⏹️ BATTLE ENDED: Skipping movement processing for completed battle ${battleId}`);
      return;
    }

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
        currentHealth: maxHealth,  // Already initialized - total health
        maxHealth,                 // Already initialized - maximum possible health
        
        // NEW PHASE 1 PROPERTIES for battalion combat system:
        baseHealthPerUnit: stats.health,  // Store original health per unit for calculations
                                         // Used in Math.round(currentHealth / baseHealthPerUnit)
                                         // Example: guardian has 14 health per unit
        
        isDestroyed: false,              // Start as alive and targetable
        // destroyedAt not set - only added when battalion is actually destroyed
        
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.USER,
        stats,
        mark: 1,
      });
      
      // Log battalion creation with new combat properties for debugging
      console.log(`🏗️ USER BATTALION CREATED: ${battalion.type} (${battalion.quantity} units, ${maxHealth} total health, ${stats.health} per unit)`);
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
        currentHealth: maxHealth,  // Already initialized - total health  
        maxHealth,                 // Already initialized - maximum possible health
        
        // NEW PHASE 1 PROPERTIES for battalion combat system:
        baseHealthPerUnit: stats.health,  // Store original health per unit for calculations
                                         // Used in Math.round(currentHealth / baseHealthPerUnit)
                                         // Example: enemy guardian has 14 health per unit
        
        isDestroyed: false,              // Start as alive and targetable
        // destroyedAt not set - only added when battalion is actually destroyed
        
        position: {
          x: nodes[battalion.nodeIndex].position.x,
          y: nodes[battalion.nodeIndex].position.y,
          nodeIndex: battalion.nodeIndex,
        },
        owner: NodeOwner.ENEMY,
        stats,
        mark: 1,
      });
      
      // Log battalion creation with new combat properties for debugging
      console.log(`🏗️ ENEMY BATTALION CREATED: ${battalion.type} (${battalion.quantity} units, ${maxHealth} total health, ${stats.health} per unit)`);
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