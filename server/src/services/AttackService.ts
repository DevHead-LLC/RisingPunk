/**
 * @file AttackService.ts
 * @description Attack state management and coordination with combat system
 */

import { IBattalion, INode, NodeOwner, RetargetingQueueTask, BattlePhase } from '../types/battle';
import { CombatService } from './CombatService';
import { RetargetingService } from './RetargetingService';
import { BattalionService } from './BattalionService';
import { Battle } from '../models/Battle';
import { MovementService } from './MovementService';
import {
  battleEngineNowMs,
  getHeadlessWorkingBattle,
  isHeadlessWorkingBattleActive,
} from './HeadlessBattleRunner';

interface AttackState {
  battleId: string;
  battalionId: string;
  targetNodeIndex: number;
  lastAttackTime: number;
  attackInterval: number;
  isAttacking: boolean;
  targetType?: 'node' | 'battalion';
  targetId?: string;
}

/** Composite key for attack state: battleId:battalionId (battalion IDs are not unique across battles). */
function attackStateKey(battleId: string, battalionId: string): string {
  return `${battleId}:${battalionId}`;
}

interface RetargetingTask {
  battleId: string;
  capturedNodeIndex?: number;
  affectedBattalionIds: string[];
  timestamp: number;
  triggerType?: 'node_capture' | 'battalion_destruction' | 'interrupted_recovery' | 'missing_target';
  destroyedBattalionId?: string;
  priority: number;
}

// Priority constants for retargeting queue processing
const RETARGETING_PRIORITIES = {
  BATTALION_DESTRUCTION: 1,    // Highest priority - immediate response required
  INTERRUPTED_RECOVERY: 1,     // Same priority as destruction - immediate response
  MISSING_TARGET: 2,           // Medium priority - target not found
  NODE_CAPTURE: 2              // Same priority as missing target - normal retargeting
} as const;

export class AttackService {
  private static attackStates = new Map<string, AttackState>();
  private static retargetingQueue: RetargetingTask[] = [];
  private static isProcessingQueue: boolean = false;
  private static attackIntervalCache = new Map<number, number>();
  
  static calculateAttackInterval(speedStat: number): number {
    // Cache attack interval calculations to avoid repeated computation
    if (this.attackIntervalCache.has(speedStat)) {
      return this.attackIntervalCache.get(speedStat)!;
    }
    
    const interval = 3000 - (speedStat * 200);
    this.attackIntervalCache.set(speedStat, interval);
    return interval;
  }
  
  static startAttack(
    battleId: string,
    battalion: IBattalion,
    targetType: 'node' | 'battalion',
    target: number | string
  ): void {
    if (this.isAttacking(battleId, battalion.id)) {
      return;
    }
    
    const attackInterval = this.calculateAttackInterval(battalion.stats.speed);
    
    const attackState: AttackState = {
      battleId,
      battalionId: battalion.id,
      targetNodeIndex: targetType === 'node' ? target as number : -1,
      lastAttackTime: battleEngineNowMs(battleId),
      attackInterval,
      isAttacking: true,
      targetType,
      targetId: targetType === 'battalion' ? target as string : undefined
    };
    
    this.attackStates.set(attackStateKey(battleId, battalion.id), attackState);
  }



  static processBattalionAttack(attacker: IBattalion, defender: IBattalion): boolean {
    if (!CombatService.canTargetBattalion(defender)) {
      return true;
    }
    
    const damage = CombatService.calculateBattalionDamage(attacker, defender);
    const destroyed = CombatService.applyBattalionDamage(defender, damage);
    
    
    return destroyed;
  }
  
  static stopAttacking(battleId: string, battalionId: string): void {
    const key = attackStateKey(battleId, battalionId);
    const attackState = this.attackStates.get(key);
    if (attackState) {
      attackState.isAttacking = false;
      this.attackStates.delete(key);
    }
  }
  
  static processAttack(battalion: IBattalion, node: INode): boolean {
    if (!CombatService.canTargetNode(node)) {
      return false;
    }
    
    const damage = CombatService.calculateTugOfWarDamage(battalion);
    const captured = CombatService.applyTugOfWarDamage(node, damage, battalion.owner);
    
    
    return captured;
  }
  
  static getBattalionsAttackingSpecificNode(battleId: string, nodeIndex: number): string[] {
    const attackers: string[] = [];
    const prefix = battleId + ':';
    for (const [key, attackState] of this.attackStates) {
      if (key.startsWith(prefix) && attackState.isAttacking && attackState.targetNodeIndex === nodeIndex) {
        attackers.push(attackState.battalionId);
      }
    }
    return attackers;
  }

  /**
   * Returns attack states for a single battle only (used by processActiveAttacks).
   * Map keys are battalion IDs (not composite); values are AttackState for that battle.
   */
  static getActiveAttacksForBattle(battleId: string): Map<string, AttackState> {
    const prefix = battleId + ':';
    const result = new Map<string, AttackState>();
    for (const [key, attackState] of this.attackStates) {
      if (key.startsWith(prefix)) {
        result.set(attackState.battalionId, attackState);
      }
    }
    return result;
  }

  static isAttacking(battleId: string, battalionId: string): boolean {
    const attackState = this.attackStates.get(attackStateKey(battleId, battalionId));
    return attackState?.isAttacking || false;
  }

  static getAttackState(battleId: string, battalionId: string): AttackState | undefined {
    return this.attackStates.get(attackStateKey(battleId, battalionId));
  }

  /** Clears attack state for a single battle (call when battle ends). */
  static clearBattleAttacks(battleId: string): void {
    const prefix = battleId + ':';
    for (const key of Array.from(this.attackStates.keys())) {
      if (key.startsWith(prefix)) {
        this.attackStates.delete(key);
      }
    }
  }

  static clearRetargetingQueueForBattle(battleId: string): void {
    this.retargetingQueue = this.retargetingQueue.filter(task => task.battleId !== battleId);
  }

  static clearBattalionAttacks(battleId: string, battalionId: string): void {
    this.attackStates.delete(attackStateKey(battleId, battalionId));
  }

  // ============================================================================
  // UNIFIED RETARGETING METHOD
  // ============================================================================

  static async executeUnifiedRetargeting(battle: any, battalionIds: string[], source: string): Promise<void> {
    
    const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
      -1, // No specific captured node for unified retargeting
      battalionIds,
      battle.battalions,
      battle.nodes,
      battle.battleId
    );
    
    if (retargetingResults.length > 0) {
      await BattalionService.updateTargetingResults(battle.battleId, retargetingResults);
      await this.initiateRetargetingMovement(battle, retargetingResults, source);
    }
  }

  // ============================================================================
  // RETARGETING QUEUE METHODS
  // ============================================================================

  static queueRetargetingTask(battleId: string, capturedNodeIndex: number, affectedBattalionIds: string[]): void {
    const task: RetargetingTask = {
      battleId,
      capturedNodeIndex,
      affectedBattalionIds,
      timestamp: battleEngineNowMs(battleId),
      triggerType: 'node_capture',
      priority: RETARGETING_PRIORITIES.NODE_CAPTURE
    };
    
    this.retargetingQueue.push(task);
    
    if (!this.isProcessingQueue) {
      this.processRetargetingQueue();
    }
  }

  static queueBattalionDestructionRetargeting(battleId: string, destroyedBattalionId: string): void {
    this.clearBattalionAttacks(battleId, destroyedBattalionId);
    
    const affectedBattalions: string[] = [];
    const prefix = battleId + ':';
    for (const [key, attackState] of this.attackStates) {
      if (key.startsWith(prefix) && attackState.targetType === 'battalion' && attackState.targetId === destroyedBattalionId) {
        affectedBattalions.push(attackState.battalionId);
        this.stopAttacking(battleId, attackState.battalionId);
      }
    }
    
    if (affectedBattalions.length > 0) {
      const task: RetargetingTask = {
        battleId,
        affectedBattalionIds: affectedBattalions,
        timestamp: battleEngineNowMs(battleId),
        triggerType: 'battalion_destruction',
        destroyedBattalionId,
        priority: RETARGETING_PRIORITIES.BATTALION_DESTRUCTION
      };
      
      this.retargetingQueue.push(task);
      
      if (!this.isProcessingQueue) {
        this.processRetargetingQueue();
      }
    } 
  }

  static queueInterruptedBattalionRetargeting(battleId: string, battalionId: string): void {
    
    this.retargetingQueue.push({
      battleId,
      triggerType: 'interrupted_recovery',
      affectedBattalionIds: [battalionId],
      capturedNodeIndex: -1,
      timestamp: battleEngineNowMs(battleId),
      priority: RETARGETING_PRIORITIES.INTERRUPTED_RECOVERY
    });
    
    if (!this.isProcessingQueue) {
      this.processRetargetingQueue();
    }
  }

  static queueMissingTargetRetargeting(battleId: string, battalionId: string): void {
    const task: RetargetingTask = {
      battleId: battleId,
      affectedBattalionIds: [battalionId],
      timestamp: battleEngineNowMs(battleId),
      triggerType: 'missing_target',
      priority: RETARGETING_PRIORITIES.MISSING_TARGET
    };
    
    this.retargetingQueue.push(task);
    
    this.processRetargetingQueue();
  }

  static async processRetargetingQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    this.retargetingQueue.sort((a, b) => a.priority - b.priority);

    while (this.retargetingQueue.length > 0) {
      const task = this.retargetingQueue.shift()!;
      
      const battle =
        getHeadlessWorkingBattle(task.battleId) ??
        (await Battle.findOne({ battleId: task.battleId }));
      if (!battle) {
        continue;
      }
      
      // Skip retargeting for completed battles
      if (battle.phase === BattlePhase.COMPLETE) {
        continue;
      }
      
      try {
        switch (task.triggerType) {
          case 'node_capture':
            await this.executeRetargetingTask(battle, task.capturedNodeIndex!, task.affectedBattalionIds!);
            break;
          case 'battalion_destruction':
            await this.executeBattalionDestructionRetargeting(battle, task.destroyedBattalionId!, task.affectedBattalionIds!);
            break;
          case 'interrupted_recovery':
            await this.executeInterruptedBattalionRetargeting(battle, task.affectedBattalionIds[0]);
            break;
          case 'missing_target':
            await this.executeMissingTargetRetargeting(battle, task.affectedBattalionIds[0]);
            break;
          default:
        }
      } catch (error) {
        console.error(`❌ RETARGETING ERROR: Failed to process ${task.triggerType}:`, error);
      }
      
      if (!isHeadlessWorkingBattleActive(task.battleId)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    this.isProcessingQueue = false;
  }

  // ============================================================================
  // EXECUTION METHODS
  // ============================================================================

  static getMovingBattalionsTargetingNode(battleId: string, targetNodeIndex: number): string[] {
    const movementStates = MovementService.getMovementStates(battleId);
    const relevantBattalions: string[] = [];
    
    for (const [battalionId, movementState] of movementStates) {
      if (movementState.movementStatus === 'moving' && 
          movementState.movementType === 'retargeting' && 
          movementState.isInterruptible &&
          movementState.finalTarget === targetNodeIndex) {
        relevantBattalions.push(battalionId);
      }
    }
    
    return relevantBattalions;
  }

  static async executeRetargetingTask(battle: any, capturedNodeIndex: number, affectedBattalionIds: string[]): Promise<void> {
    
    const movingBattalionsToThisNode = this.getMovingBattalionsTargetingNode(battle.battleId, capturedNodeIndex);
    if (movingBattalionsToThisNode.length > 0) {
      
      const interruptedBattalions = new Set<string>();
      
      for (const battalionId of movingBattalionsToThisNode) {
        if (interruptedBattalions.has(battalionId)) {
          continue;
        }
        
                  const interrupted = MovementService.interruptRetargetingMovement(battalionId, battle.battleId, battle);
        if (interrupted) {
          interruptedBattalions.add(battalionId);
        }
      }
      
      if (interruptedBattalions.size > 0) {
        const movementStates = MovementService.getMovementStates(battle.battleId);
        
        for (const battalionId of interruptedBattalions) {
          const movementState = movementStates.get(battalionId);
          const battalion = battle.battalions.find((b: any) => b.id === battalionId);
          
          if (movementState && battalion && movementState.wasInterrupted && movementState.interruptionPosition) {
            
            this.queueInterruptedBattalionRetargeting(battle.battleId, battalionId);
          }
        }
        
        if (!isHeadlessWorkingBattleActive(battle.battleId)) {
          await battle.save();
        }
      }
    }
    
    
    if (affectedBattalionIds.length > 0) {
      
      const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
        capturedNodeIndex,
        affectedBattalionIds,
        battle.battalions,
        battle.nodes,
        battle.battleId
      );
      
      if (retargetingResults.length > 0) {
        await BattalionService.updateTargetingResults(battle.battleId, retargetingResults);
        await this.initiateRetargetingMovement(battle, retargetingResults, 'NODE_CAPTURE_RETARGETING');
      }
    }
  }

  static async executeBattalionDestructionRetargeting(battle: any, destroyedBattalionId: string, affectedBattalionIds: string[]): Promise<void> {
    
    if (affectedBattalionIds.length > 0) {
      await this.executeUnifiedRetargeting(battle, affectedBattalionIds, 'BATTALION_DESTRUCTION');
    }
  }

  static async executeInterruptedBattalionRetargeting(battle: any, battalionId: string): Promise<void> {
    
    await this.executeUnifiedRetargeting(battle, [battalionId], 'INTERRUPTED_RECOVERY');
  }

  static async executeMissingTargetRetargeting(battle: any, battalionId: string): Promise<void> {
    
    await this.executeUnifiedRetargeting(battle, [battalionId], 'MISSING_TARGET');
  }

  static async initiateRetargetingMovement(battle: any, retargetingResults: any[], source: string = 'REGULAR_RETARGETING'): Promise<void> {
    
    for (const result of retargetingResults) {
      const battalion = battle.battalions.find((b: any) => b.id === result.battalionId);
      if (!battalion) {
        continue;
      }
            
      const { MovementService } = require('./MovementService');
      const { ScreenDimensionService } = require('./ScreenDimensionService');
      
      const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battle.battleId);
      
      const movementState = MovementService.initiateMovement(
        battalion,
        result.newTargetNodeIndex,
        screenDimensions.width,
        screenDimensions.height,
        'retargeting',
        result.pathToTarget,
        battle,
        'INTERRUPTED_BATTALION_RETARGETING'
      );
      
      if (movementState) {
        const battleMovementStates = MovementService.getMovementStates(battle.battleId);
        battleMovementStates.set(battalion.id, movementState);
      }
    }
    
  }

  // ============================================================================
  // UNIFIED ATTACK PROCESSING
  // ============================================================================

  static processUnifiedAttack(attacker: IBattalion, target: IBattalion | INode, targetType: 'battalion' | 'node'): boolean {
    
    if (targetType === 'battalion') {
      const defender = target as IBattalion;
      return this.processBattalionAttack(attacker, defender);
    } else {
      const node = target as INode;
      return this.processAttack(attacker, node);
    }
  }

  // ============================================================================
  // EXISTING ATTACK METHODS (KEPT FOR BACKWARD COMPATIBILITY)
  // ============================================================================

  static async processActiveAttacks(battle: any): Promise<void> {
    if (battle.phase === 'COMPLETE') {
      return;
    }

    const battleId = battle.battleId;
    const now = battleEngineNowMs(battleId);
    for (const [battalionId, attackState] of this.getActiveAttacksForBattle(battleId)) {
      if (now - attackState.lastAttackTime >= attackState.attackInterval) {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
        
        if (!battalion) {
          this.stopAttacking(battleId, battalionId);
          continue;
        }
        
        if (battalion.isDestroyed || battalion.quantity <= 0 || battalion.currentHealth <= 0) {
          this.stopAttacking(battleId, battalionId);
          continue;
        }
        
        if (attackState.targetType === 'battalion') {
          const defender = battle.battalions.find((b: IBattalion) => b.id === attackState.targetId);
          
          if (defender && !defender.isDestroyed) {
            const destroyed = this.processUnifiedAttack(battalion, defender, 'battalion');
            attackState.lastAttackTime = now;
            
            if (destroyed) {
              if (!isHeadlessWorkingBattleActive(battle.battleId)) {
                await battle.save();
              }
              this.queueBattalionDestructionRetargeting(battle.battleId, defender.id);
            }
          } else {
            if (!defender) {
              this.queueMissingTargetRetargeting(battle.battleId, battalionId);
            } else if (defender.isDestroyed) {
              this.queueMissingTargetRetargeting(battle.battleId, battalionId);
            }
            this.stopAttacking(battleId, battalionId);
          }
          
        } else {
          const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
          
          if (node && CombatService.canTargetNode(node)) {
            const captured = this.processUnifiedAttack(battalion, node, 'node');
            attackState.lastAttackTime = now;
            
            if (captured) {
              const affectedAttackers = this.getBattalionsAttackingSpecificNode(battleId, node.index);
              affectedAttackers.forEach(id => this.stopAttacking(battleId, id));
              this.queueRetargetingTask(battle.battleId, node.index, affectedAttackers);
            }
          } else {
            this.stopAttacking(battleId, battalionId);
          }
        }
        
        if (!isHeadlessWorkingBattleActive(battle.battleId)) {
          await battle.save();
        }
      }
    }
  }
}