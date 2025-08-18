/**
 * @file BattalionService.ts
 * @description Battalion creation and business logic authority
 */

import { IBattalion, INode, NodeOwner, BotType, BattalionTargetingResult } from '../types/battle';
import { BotService } from './BotService';
import { MovementService } from './MovementService';
import { MovementState } from '../types/battle';
import { Battle } from '../models/Battle';
import { TargetingService } from './TargetingService';

export class BattalionService {
  private static targetingResults: Map<string, BattalionTargetingResult[]> = new Map();
  private static validBotTypes = ['guardian', 'breacher', 'phreak'] as const;
  private static userBotTypeCache = new Map<string, BotType>();
  private static enemyBotTypeCache = new Map<string, BotType>();

  static async triggerInitialTargeting(battalions: IBattalion[], nodes: INode[], battleId: string): Promise<BattalionTargetingResult[]> {
    const results = TargetingService.assignInitialTargets(battalions, nodes);
    this.targetingResults.set(battleId, results);
    return results;
  }

  static getTargetingResults(battleId?: string): BattalionTargetingResult[] {
    return battleId ? this.targetingResults.get(battleId) || [] : [];
  }

  static async updateTargetingResults(battleId: string, retargetingResults: Array<{battalionId: string, newTargetNodeIndex: number, pathToTarget: number[], targetType?: 'neutral_node' | 'enemy_battalion', targetBattalionId?: string}>): Promise<void> {
    
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
      }
    });
    
    this.targetingResults.set(battleId, Array.from(resultMap.values()));
  }

  static getTargetingResultForBattalion(battalionId: string, battleId?: string): BattalionTargetingResult | null {
    const targetingResults = this.getTargetingResults(battleId);
    const result = targetingResults.find(result => result.battalionId === battalionId);
    
    if (result) {
      return result;
    } else {
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

  private static validateBotType(botType: string): BotType {
    // Check cache first
    if (this.userBotTypeCache.has(botType)) {
      return this.userBotTypeCache.get(botType)!;
    }

    // Validate bot type
    if (!this.validBotTypes.includes(botType as any)) {
      console.log(`⚠️ INVALID BOT TYPE: "${botType}" is not a valid bot type. Using 'guardian' as fallback.`);
      this.userBotTypeCache.set(botType, 'guardian' as BotType);
      return 'guardian' as BotType;
    }

    const validatedBotType = botType as BotType;
    
    // Bot type validation is now handled by BotStatsService
    // We'll validate when actually creating the battalion
    this.userBotTypeCache.set(botType, validatedBotType);
    return validatedBotType;
  }

  static validateEnemyBotType(botType: string): BotType {
    // Check cache first
    if (this.enemyBotTypeCache.has(botType)) {
      return this.enemyBotTypeCache.get(botType)!;
    }

    // Validate bot type
    if (!this.validBotTypes.includes(botType as any)) {
      console.log(`⚠️ INVALID BOT TYPE: "${botType}" is not a valid bot type. Using 'guardian' as fallback.`);
      this.enemyBotTypeCache.set(botType, 'guardian' as BotType);
      return 'guardian' as BotType;
    }

    const validatedBotType = botType as BotType;
    
    // Bot type validation is now handled by BotStatsService
    // We'll validate when actually creating the battalion
    this.enemyBotTypeCache.set(botType, validatedBotType);
    return validatedBotType;
  }

  static async createUserBattalions(nodes: INode[], userLevel: number, userBattalions?: Array<{type: string, quantity: number}>): Promise<IBattalion[]> {
    const defaultUserBattalions = [
      { type: 'guardian' as BotType, quantity: 10 },
      { type: 'breacher' as BotType, quantity: 8 },
      { type: 'phreak' as BotType, quantity: 6 },
    ];
    
    const battalionConfigs = userBattalions || defaultUserBattalions;
    
    // Available user nodes (0, 1, 2) - allow multiple battalions at same node
    const availableUserNodes = [0, 1, 2];
    
    const battalions: IBattalion[] = [];
    
    for (const battalion of battalionConfigs) {
      const validatedBotType = this.validateBotType(battalion.type);
      
      // Get stats from BotService based on user level
      const botConfig = await BotService.getUserBotStats(validatedBotType, userLevel);
      
      // Random node selection from available user nodes
      // Multiple battalions can share the same node
      const randomNodeIndex = Math.floor(Math.random() * availableUserNodes.length);
      const nodeIndex = availableUserNodes[randomNodeIndex];
      
      battalions.push(this.createBattalion(
        `user-battalion-${battalions.length}`,
        validatedBotType,
        battalion.quantity,
        nodeIndex,
        NodeOwner.USER,
        botConfig.stats,
        nodes
      ));
    }
    
    return battalions;
  }

  static async createEnemyBattalions(nodes: INode[], userLevel: number): Promise<IBattalion[]> {
    const enemyBattalions = [
      { type: 'guardian' as BotType, quantity: 8 },
      { type: 'breacher' as BotType, quantity: 10 },
      { type: 'phreak' as BotType, quantity: 7 },
    ];
    
    // Available enemy nodes (6, 7, 8) - allow multiple battalions at same node
    const availableEnemyNodes = [6, 7, 8];
    
    const battalions: IBattalion[] = [];
    
    for (const battalion of enemyBattalions) {
      const validatedBotType = this.validateEnemyBotType(battalion.type);
      
      // Get stats from BotService based on user level
      const botConfig = await BotService.getEnemyBotStats(validatedBotType, userLevel);
      
      // Random node selection from available enemy nodes
      // Multiple battalions can share the same node
      const randomNodeIndex = Math.floor(Math.random() * availableEnemyNodes.length);
      const nodeIndex = availableEnemyNodes[randomNodeIndex];
      
      battalions.push(this.createBattalion(
        `enemy-battalion-${battalions.length}`,
        validatedBotType,
        battalion.quantity,
        nodeIndex,
        NodeOwner.ENEMY,
        botConfig.stats,
        nodes
      ));
    }
    
    return battalions;
  }


  static async createEnemyBattalionsFromNPC(
    nodes: INode[],
    userLevel: number,
    npc: {
      battalions: Array<{ type: string; quantity: number }>;
      statMultipliers: { health: number; speed: number; offense: number; defense: number; range: number };
    }
  ): Promise<IBattalion[]> {
    const availableEnemyNodes = [6, 7, 8];

    const battalions: IBattalion[] = [];

    for (const battalion of npc.battalions) {
      const validatedBotType = this.validateEnemyBotType(battalion.type);

      // Get stats from BotService based on user level (no statMultipliers needed)
      const botConfig = await BotService.getEnemyBotStats(validatedBotType, userLevel);
      const base = botConfig.stats;
      
      // No scaling needed - stats are already at the correct level
      const scaledStats = {
        health: base.health,
        speed: base.speed,
        range: base.range,
        offense: base.offense,
        defense: base.defense,
      };

      const randomNodeIndex = Math.floor(Math.random() * availableEnemyNodes.length);
      const nodeIndex = availableEnemyNodes[randomNodeIndex];

      battalions.push(this.createBattalion(
        `enemy-battalion-${battalions.length}`,
        validatedBotType,
        battalion.quantity,
        nodeIndex,
        NodeOwner.ENEMY,
        scaledStats,
        nodes
      ));
    }

    return battalions;
  }

} 