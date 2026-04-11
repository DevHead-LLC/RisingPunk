/**
 * @file BattalionService.ts
 * @description Battalion creation and business logic authority
 */

import { IBattalion, INode, NodeOwner, BotType, BattalionTargetingResult } from '../types/battle';
import { BotService, ArmyBonus } from './BotService';
import { BattalionFactory } from './BattalionFactory';
import { normalizeNpcBattalionMarkLevel } from '../utils/npcMarkMixConfig';
import { MovementService } from './MovementService';
import { MovementState } from '../types/battle';
import { Battle } from '../models/Battle';
import { TargetingService } from './TargetingService';
import { getHeadlessWorkingBattle } from './HeadlessBattleRunner';

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

  /**
   * Appends new battalions to an existing targeting map without replacing it.
   * Used when defender waves deploy mid-battle so their IDs exist before retargeting updates them.
   */
  static seedNewBattalionsIntoTargetingMap(battalions: IBattalion[], nodes: INode[], battleId: string): void {
    const newResults = TargetingService.assignInitialTargets(battalions, nodes);
    const currentResults = this.getTargetingResults(battleId);
    const existingIds = new Set(currentResults.map(r => r.battalionId));
    let seeded = 0;
    for (const result of newResults) {
      if (!existingIds.has(result.battalionId)) {
        currentResults.push(result);
        seeded++;
      }
    }
    if (seeded > 0) {
      this.targetingResults.set(battleId, currentResults);
    }
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
    const w = getHeadlessWorkingBattle(battleId);
    if (w) {
      return w;
    }
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

  static async updateBattleMovement(battleId: string, headlessMicroStepMs?: number): Promise<void> {
    const battle = await this.getBattle(battleId);
    const targetingResults = this.getTargetingResults(battleId);

    if (!battle) return;

    if (headlessMicroStepMs !== undefined) {
      await MovementService.updateBattleMovement(battleId, battle, targetingResults, headlessMicroStepMs);
      const { AttackService } = require('./AttackService');
      await AttackService.processActiveAttacks(battle);
      return;
    }

    await MovementService.coordinateMovementState(battleId, battle, targetingResults);
  }

  static calculateTotalArmyHealth(battalions: IBattalion[]): number {
    return battalions.reduce((total, battalion) => total + (battalion.stats.health * battalion.quantity), 0);
  }



  private static validateBotType(botType: string): BotType {
    // Check cache first
    if (this.userBotTypeCache.has(botType)) {
      return this.userBotTypeCache.get(botType)!;
    }

    // Validate bot type
    if (!this.validBotTypes.includes(botType as any)) {
      console.error(`⚠️ INVALID BOT TYPE: "${botType}" is not a valid bot type. Using 'guardian' as fallback.`);
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
      console.error(`⚠️ INVALID BOT TYPE: "${botType}" is not a valid bot type. Using 'guardian' as fallback.`);
      this.enemyBotTypeCache.set(botType, 'guardian' as BotType);
      return 'guardian' as BotType;
    }

    const validatedBotType = botType as BotType;
    
    // Bot type validation is now handled by BotStatsService
    // We'll validate when actually creating the battalion
    this.enemyBotTypeCache.set(botType, validatedBotType);
    return validatedBotType;
  }

  static async createUserBattalions(
    nodes: INode[],
    userLevel: number,
    userBattalions?: Array<{ type: string; quantity: number; markLevel?: number }>,
    armyBonus?: ArmyBonus,
    guardianBonus?: ArmyBonus,
    phreakBonus?: { strength: number; defense: number; speed: number; health: number }
  ): Promise<IBattalion[]> {
    if (!userBattalions || userBattalions.length === 0) {
      return [];
    }
    
    const battalionConfigs = userBattalions;
    
    // Available user nodes (0, 1, 2) - allow multiple battalions at same node
    const availableUserNodes = [0, 1, 2];
    
    const battalions: IBattalion[] = [];
    
    for (const battalion of battalionConfigs) {
      if (!battalion.quantity || battalion.quantity <= 0) {
        continue;
      }
      const validatedBotType = this.validateBotType(battalion.type);
      const markLevel =
        typeof battalion.markLevel === 'number' && battalion.markLevel >= 2 ? 2 : 1;

      // Get stats from BotService (army bonus for breacher, guardian bonus for guardian, phreak bonus for phreak)
      const botConfig = await BotService.getUserBotStats(
        validatedBotType,
        userLevel,
        armyBonus,
        guardianBonus,
        phreakBonus,
        markLevel as 1 | 2
      );
      
      // Random node selection from available user nodes
      // Multiple battalions can share the same node
      const randomNodeIndex = Math.floor(Math.random() * availableUserNodes.length);
      const nodeIndex = availableUserNodes[randomNodeIndex];
      
      battalions.push(
        BattalionFactory.createBattalion(
          `user-battalion-${battalions.length}`,
          validatedBotType,
          battalion.quantity,
          nodeIndex,
          NodeOwner.USER,
          botConfig.stats,
          nodes,
          markLevel
        )
      );
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
      
      battalions.push(BattalionFactory.createBattalion(
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
      battalions: Array<{ type: string; quantity: number; markLevel?: number }>;
      statMultipliers: { health: number; speed: number; offense: number; defense: number; range: number };
    }
  ): Promise<IBattalion[]> {
    const availableEnemyNodes = [6, 7, 8];

    const battalions: IBattalion[] = [];

    for (const battalion of npc.battalions) {
      const validatedBotType = this.validateEnemyBotType(battalion.type);
      const markLevel = normalizeNpcBattalionMarkLevel(battalion.markLevel);

      const botConfig = await BotService.getEnemyBotStats(validatedBotType, userLevel, markLevel);
      const base = botConfig.stats;

      const scaledStats = {
        health: base.health,
        speed: base.speed,
        range: base.range,
        offense: base.offense,
        defense: base.defense,
      };

      const randomNodeIndex = Math.floor(Math.random() * availableEnemyNodes.length);
      const nodeIndex = availableEnemyNodes[randomNodeIndex];

      battalions.push(
        BattalionFactory.createBattalion(
          `enemy-battalion-${battalions.length}`,
          validatedBotType,
          battalion.quantity,
          nodeIndex,
          NodeOwner.ENEMY,
          scaledStats,
          nodes,
          markLevel
        )
      );
    }

    return battalions;
  }

} 