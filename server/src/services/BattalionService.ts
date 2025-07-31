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

export class BattalionService {
  private static targetingResults: Map<string, BattalionTargetingResult[]> = new Map();
  private static validBotTypes = ['guardian', 'breacher', 'phreak'] as const;
  private static botTypeCache = new Map<string, BotType>();

  static async triggerInitialTargeting(battalions: IBattalion[], nodes: INode[], battleId: string): Promise<BattalionTargetingResult[]> {
    console.log('🎯 TRIGGERING INITIAL TARGETING for battle:', battleId);
    const results = TargetingService.assignInitialTargets(battalions, nodes);
    this.targetingResults.set(battleId, results);
    return results;
  }

  static getTargetingResults(battleId?: string): BattalionTargetingResult[] {
    return battleId ? this.targetingResults.get(battleId) || [] : [];
  }

  static async updateTargetingResults(battleId: string, retargetingResults: Array<{battalionId: string, newTargetNodeIndex: number, pathToTarget: number[], targetType?: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string}>): Promise<void> {
    console.log(`🎯 BATTALION SERVICE: Updating targeting for ${retargetingResults.length} battalions`);
    
    const currentResults = this.getTargetingResults(battleId);
    
    // Use Map for faster lookups instead of findIndex
    const resultMap = new Map(currentResults.map(result => [result.battalionId, result]));
    
    retargetingResults.forEach(retargetResult => {
      const existingResult = resultMap.get(retargetResult.battalionId);
      
      if (existingResult) {
        existingResult.targetNode = retargetResult.newTargetNodeIndex;
        existingResult.targetType = retargetResult.targetType;
        existingResult.targetBattalionId = retargetResult.targetBattalionId;
        
        const targetInfo = retargetResult.targetType === 'enemy_battalion' 
          ? `${retargetResult.targetType} ${retargetResult.targetBattalionId} at node ${retargetResult.newTargetNodeIndex}`
          : `${retargetResult.targetType} at node ${retargetResult.newTargetNodeIndex}`;
        console.log(`🎯 TARGETING UPDATE: Battalion ${retargetResult.battalionId} now targeting ${targetInfo}`);
      } else {
        console.log(`🎯 BATTALION SERVICE WARNING: Battalion ${retargetResult.battalionId} not found in current targeting results`);
      }
    });
    
    this.targetingResults.set(battleId, Array.from(resultMap.values()));
  }

  static getTargetingResultForBattalion(battalionId: string, battleId?: string): BattalionTargetingResult | null {
    const targetingResults = this.getTargetingResults(battleId);
    const result = targetingResults.find(result => result.battalionId === battalionId);
    
    if (result) {
      console.log(`🎯 TARGETING LOOKUP: Battalion ${battalionId} is targeting ${result.targetType || 'unknown'} at node ${result.targetNode}`);
      return result;
    } else {
      console.log(`🎯 TARGETING LOOKUP: No targeting result found for battalion ${battalionId}`);
      return null;
    }
  }

  static clearTargetingResults(battleId: string): void {
    this.targetingResults.delete(battleId);
  }

  static async getBattle(battleId: string): Promise<any> {
    return Battle.findOne({ battleId });
  }

  static startMovementUpdates(battleId: string): void {
    MovementService.startMovementUpdates(battleId, async (battleId: string) => {
      await this.updateBattleMovement(battleId);
    });
  }

  static stopMovementUpdates(battleId: string): void {
    MovementService.stopMovementUpdates(battleId);
  }

  static async updateBattleMovement(battleId: string): Promise<void> {
    const battle = await this.getBattle(battleId);
    const targetingResults = this.getTargetingResults(battleId);
    
    if (!battle) return;

    // Use centralized movement state coordination
    await MovementService.coordinateMovementState(battleId, battle, targetingResults);
  }

  static calculateTotalArmyHealth(battalions: IBattalion[]): number {
    return battalions.reduce((total, battalion) => total + (battalion.stats.health * battalion.quantity), 0);
  }

  private static createBattalion(
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
    
    console.log(`🏗️ ${owner.toUpperCase()} BATTALION CREATED: ${type} (${quantity} units, ${maxHealth} total health, ${stats.health} per unit)`);
    
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

  private static validateBotType(botType: string): BotType {
    // Check cache first
    if (this.botTypeCache.has(botType)) {
      return this.botTypeCache.get(botType)!;
    }

    // Validate bot type
    if (!this.validBotTypes.includes(botType as any)) {
      console.log(`⚠️ INVALID BOT TYPE: "${botType}" is not a valid bot type. Using 'guardian' as fallback.`);
      this.botTypeCache.set(botType, 'guardian' as BotType);
      return 'guardian' as BotType;
    }

    const validatedBotType = botType as BotType;
    
    // Ensure the bot type exists in BOT_CONFIG
    if (!BOT_CONFIG.USER_BOT_STATS[validatedBotType]) {
      console.log(`⚠️ MISSING BOT CONFIG: "${validatedBotType}" not found in BOT_CONFIG. Using 'guardian' as fallback.`);
      this.botTypeCache.set(botType, 'guardian' as BotType);
      return 'guardian' as BotType;
    }

    this.botTypeCache.set(botType, validatedBotType);
    return validatedBotType;
  }

  static createUserBattalions(nodes: INode[], userBattalions?: Array<{type: string, quantity: number, nodeIndex: number}>): IBattalion[] {
    const defaultUserBattalions = [
      { type: 'guardian' as BotType, quantity: 10, nodeIndex: 0 },
      { type: 'breacher' as BotType, quantity: 8, nodeIndex: 1 },
      { type: 'phreak' as BotType, quantity: 6, nodeIndex: 2 },
    ];
    
    const battalionConfigs = userBattalions || defaultUserBattalions;
    
    return battalionConfigs.map((battalion, index) => {
      const validatedBotType = this.validateBotType(battalion.type);
      
      return this.createBattalion(
        `user-battalion-${index}`,
        validatedBotType,
        battalion.quantity,
        battalion.nodeIndex,
        NodeOwner.USER,
        BOT_CONFIG.USER_BOT_STATS[validatedBotType].stats,
        nodes
      );
    });
  }

  static createEnemyBattalions(nodes: INode[]): IBattalion[] {
    const enemyBattalions = [
      { type: 'guardian' as BotType, quantity: 8, nodeIndex: 6 },
      { type: 'breacher' as BotType, quantity: 10, nodeIndex: 7 },
      { type: 'phreak' as BotType, quantity: 7, nodeIndex: 8 },
    ];
    
    return enemyBattalions.map((battalion, index) => 
      this.createBattalion(
        `enemy-battalion-${index}`,
        battalion.type,
        battalion.quantity,
        battalion.nodeIndex,
        NodeOwner.ENEMY,
        BOT_CONFIG.ENEMY_BOT_STATS[battalion.type].stats,
        nodes
      )
    );
  }

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
          
          battalion.position.nodeIndex = movementState.targetPosition.nodeIndex;
          battalion.position.x = movementState.targetPosition.x;
          battalion.position.y = movementState.targetPosition.y;
          
          console.log(`🔄 SERVER POSITION: ${battalion.owner} ${battalion.type} moved ${oldPosition} → ${battalion.position.nodeIndex}`);
          
          positionUpdates.push({
            battalionId: battalion.id,
            oldPosition,
            newPosition: battalion.position.nodeIndex,
            coordinates: { x: battalion.position.x, y: battalion.position.y }
          });
        }
      }
      
      if (movementState.movementStatus === 'moving') {
        movementUpdates.push({
          battalionId,
          movementState
        });
      }
    }
    
    return { positionUpdates, movementUpdates };
  }
} 