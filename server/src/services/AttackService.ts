/**
 * @file AttackService.ts
 * @description Attack state management and coordination with combat system
 */

import { IBattalion, INode, NodeOwner, RetargetingQueueTask } from '../types/battle';
import { CombatService } from './CombatService';
import { RetargetingService } from './RetargetingService';
import { BattalionService } from './BattalionService';
import { Battle } from '../models/Battle';
import { MovementService } from './MovementService';

interface AttackState {
  battalionId: string;
  targetNodeIndex: number;
  lastAttackTime: number;
  attackInterval: number;
  isAttacking: boolean;
  targetType?: 'node' | 'battalion';
  targetId?: string;
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
  
  static calculateAttackInterval(speedStat: number): number {
    return 3000 - (speedStat * 200);
  }
  
  static startAttacking(battalion: IBattalion, targetNodeIndex: number): void {
    // Check if battalion is already attacking
    if (this.isAttacking(battalion.id)) {
      console.log(`🚫 ATTACK BLOCKED: ${battalion.owner} ${battalion.type} is already attacking, cannot start new attack`);
      return;
    }
    
    const attackInterval = this.calculateAttackInterval(battalion.stats.speed);
    
    const attackState: AttackState = {
      battalionId: battalion.id,
      targetNodeIndex,
      lastAttackTime: Date.now(),
      attackInterval,
      isAttacking: true,
      targetType: 'node'
    };
    
    this.attackStates.set(battalion.id, attackState);
    console.log(`⚔️ ${battalion.owner} ${battalion.type} started attacking node ${targetNodeIndex} (interval: ${attackInterval}ms)`);
  }

  static startBattalionAttack(attacker: IBattalion, targetId: string): void {
    // Check if battalion is already attacking
    if (this.isAttacking(attacker.id)) {
      console.log(`🚫 BATTALION ATTACK BLOCKED: ${attacker.owner} ${attacker.type} is already attacking, cannot start new battalion attack`);
      return;
    }
    
    const attackInterval = this.calculateAttackInterval(attacker.stats.speed);
    
    const attackState: AttackState = {
      battalionId: attacker.id,
      targetNodeIndex: -1,
      lastAttackTime: Date.now(),
      attackInterval,
      isAttacking: true,
      targetType: 'battalion',
      targetId: targetId
    };
    
    this.attackStates.set(attacker.id, attackState);
    console.log(`⚔️ BATTALION ATTACK STARTED: ${attacker.owner} ${attacker.type} (${attacker.id}) → ${targetId} (interval: ${attackInterval}ms)`);
  }

  static processBattalionAttack(attacker: IBattalion, defender: IBattalion): boolean {
    if (!CombatService.canTargetBattalion(defender)) {
      return true;
    }
    
    const damage = CombatService.calculateBattalionDamage(attacker, defender);
    const destroyed = CombatService.applyBattalionDamage(defender, damage);
    
    console.log(`⚔️ BATTALION ATTACK RESULT: ${attacker.owner} ${attacker.type} deals ${damage} damage to ${defender.owner} ${defender.type} (${defender.currentHealth} health remaining, destroyed: ${destroyed})`);
    
    console.log(`⚔️ BATTALION ATTACK END: Returning destroyed=${destroyed}`);
    return destroyed;
  }
  
  static stopAttacking(battalionId: string): void {
    const attackState = this.attackStates.get(battalionId);
    if (attackState) {
      attackState.isAttacking = false;
      this.attackStates.delete(battalionId);
      console.log(`🛑 Battalion ${battalionId} stopped attacking`);
    }
  }
  
  static processAttack(battalion: IBattalion, node: INode): boolean {
    if (!CombatService.canTargetNode(node)) {
      return false;
    }
    
    const damage = CombatService.calculateTugOfWarDamage(battalion);
    const captured = CombatService.applyTugOfWarDamage(node, damage, battalion.owner);
    
    console.log(`⚔️ ${battalion.owner} ${battalion.type} dealt ${damage} damage to node ${node.index} (progress: ${node.tugOfWarProgress}%)`);
    
    return captured;
  }
  
  static getBattalionsAttackingSpecificNode(nodeIndex: number): string[] {
    console.log(`🔍 SELECTIVE: Finding battalions attacking node ${nodeIndex} specifically`);

    const attackers: string[] = [];
    for (const [battalionId, attackState] of this.attackStates) {
      if (attackState.isAttacking && attackState.targetNodeIndex === nodeIndex) {
        attackers.push(battalionId);
      }
    }

    console.log(`🔍 SELECTIVE: Found ${attackers.length} battalions attacking node ${nodeIndex}`);
    return attackers;
  }
  
  static getActiveAttacks(): Map<string, AttackState> {
    return new Map(this.attackStates);
  }
  
  static isAttacking(battalionId: string): boolean {
    const attackState = this.attackStates.get(battalionId);
    return attackState?.isAttacking || false;
  }
  
  static getAttackState(battalionId: string): AttackState | undefined {
    return this.attackStates.get(battalionId);
  }
  
  static clearAllAttacks(): void {
    this.attackStates.clear();
  }

  static clearBattalionAttacks(battalionId: string): void {
    this.attackStates.delete(battalionId);
    console.log(`🧹 CLEARED ATTACKS: Removed attack state for battalion ${battalionId}`);
  }

  // ============================================================================
  // UNIFIED RETARGETING METHOD
  // ============================================================================

  static async executeUnifiedRetargeting(battle: any, battalionIds: string[], source: string): Promise<void> {
    console.log(`🎯 UNIFIED RETARGETING [${source}]: Processing ${battalionIds.length} battalions`);
    
    const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
      -1, // No specific captured node for unified retargeting
      battalionIds,
      battle.battalions,
      battle.nodes
    );
    
    if (retargetingResults.length > 0) {
      await BattalionService.updateTargetingResults(battle.battleId, retargetingResults);
      await this.initiateRetargetingMovement(battle, retargetingResults, source);
      console.log(`🎯 UNIFIED RETARGETING [${source}]: ${retargetingResults.length} battalions retargeted`);
    } else {
      console.log(`🎯 UNIFIED RETARGETING [${source}]: No valid targets found for any battalions`);
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
      timestamp: Date.now(),
      triggerType: 'node_capture',
      priority: RETARGETING_PRIORITIES.NODE_CAPTURE
    };
    
    this.retargetingQueue.push(task);
    console.log(`📋 RETARGETING QUEUE: Added task for node ${capturedNodeIndex} capture (queue size: ${this.retargetingQueue.length})`);
    
    if (!this.isProcessingQueue) {
      this.processRetargetingQueue();
    }
  }

  static queueBattalionDestructionRetargeting(battleId: string, destroyedBattalionId: string): void {
    this.clearBattalionAttacks(destroyedBattalionId);
    
    const affectedBattalions: string[] = [];
    
    for (const [battalionId, attackState] of this.attackStates) {
      if (attackState.targetType === 'battalion' && attackState.targetId === destroyedBattalionId) {
        affectedBattalions.push(battalionId);
        console.log(`🎯 DESTRUCTION AFFECTED: Battalion ${battalionId} was targeting destroyed ${destroyedBattalionId}`);
        this.stopAttacking(battalionId);
      }
    }
    
    if (affectedBattalions.length > 0) {
      const task: RetargetingTask = {
        battleId,
        affectedBattalionIds: affectedBattalions,
        timestamp: Date.now(),
        triggerType: 'battalion_destruction',
        destroyedBattalionId,
        priority: RETARGETING_PRIORITIES.BATTALION_DESTRUCTION
      };
      
      this.retargetingQueue.push(task);
      console.log(`📋 DESTRUCTION RETARGETING: ${affectedBattalions.length} battalions need new targets after ${destroyedBattalionId} destruction (queue size: ${this.retargetingQueue.length})`);
      
      if (!this.isProcessingQueue) {
        this.processRetargetingQueue();
      }
    } else {
      console.log(`📋 DESTRUCTION RETARGETING: No battalions were targeting destroyed ${destroyedBattalionId}`);
    }
  }

  static queueInterruptedBattalionRetargeting(battleId: string, battalionId: string): void {
    console.log(`📋 INTERRUPTED RETARGETING: Queueing retargeting for recovered battalion ${battalionId}`);
    
    this.retargetingQueue.push({
      battleId,
      triggerType: 'interrupted_recovery',
      affectedBattalionIds: [battalionId],
      capturedNodeIndex: -1,
      timestamp: Date.now(),
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
      timestamp: Date.now(),
      triggerType: 'missing_target',
      priority: RETARGETING_PRIORITIES.MISSING_TARGET
    };
    
    this.retargetingQueue.push(task);
    console.log(`📋 MISSING TARGET RETARGETING: Queueing retargeting for battalion ${battalionId} (queue size: ${this.retargetingQueue.length})`);
    
    this.processRetargetingQueue();
  }

  static async processRetargetingQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    console.log(`⚙️ RETARGETING QUEUE: Starting sequential processing`);
    
    this.retargetingQueue.sort((a, b) => a.priority - b.priority);

    while (this.retargetingQueue.length > 0) {
      const task = this.retargetingQueue.shift()!;
      
      const battle = await Battle.findOne({ battleId: task.battleId });
      if (!battle) {
        console.log(`❌ RETARGETING ERROR: Battle ${task.battleId} not found`);
        continue;
      }
      
      try {
        switch (task.triggerType) {
          case 'node_capture':
            console.log(`⚙️ RETARGETING QUEUE: Processing node capture ${task.capturedNodeIndex} (${task.affectedBattalionIds?.length || 0} battalions)`);
            await this.executeRetargetingTask(battle, task.capturedNodeIndex!, task.affectedBattalionIds!);
            break;
          case 'battalion_destruction':
            console.log(`⚙️ RETARGETING QUEUE: Processing battalion destruction ${task.destroyedBattalionId} (${task.affectedBattalionIds?.length || 0} battalions)`);
            await this.executeBattalionDestructionRetargeting(battle, task.destroyedBattalionId!, task.affectedBattalionIds!);
            break;
          case 'interrupted_recovery':
            console.log(`⚙️ RETARGETING QUEUE: Processing interrupted recovery ${task.affectedBattalionIds[0]}`);
            await this.executeInterruptedBattalionRetargeting(battle, task.affectedBattalionIds[0]);
            break;
          case 'missing_target':
            console.log(`⚙️ RETARGETING QUEUE: Processing missing target retargeting ${task.affectedBattalionIds[0]}`);
            await this.executeMissingTargetRetargeting(battle, task.affectedBattalionIds[0]);
            break;
          default:
            console.log(`❌ RETARGETING ERROR: Unknown trigger type ${task.triggerType}`);
        }
      } catch (error) {
        console.log(`❌ RETARGETING ERROR: Failed to process ${task.triggerType}:`, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.isProcessingQueue = false;
    console.log(`⚙️ RETARGETING QUEUE: Finished processing all tasks`);
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
        console.log(`🛑 INTERRUPT: Battalion ${battalionId} moving to captured node ${targetNodeIndex}`);
      }
    }
    
    return relevantBattalions;
  }

  static async executeRetargetingTask(battle: any, capturedNodeIndex: number, affectedBattalionIds: string[]): Promise<void> {
    console.log(`🎯 EXECUTING: Retargeting for node ${capturedNodeIndex} capture`);
    
    const movingBattalionsToThisNode = this.getMovingBattalionsTargetingNode(battle.battleId, capturedNodeIndex);
    if (movingBattalionsToThisNode.length > 0) {
      console.log(`🛑 CAPTURE INTERRUPT: ${movingBattalionsToThisNode.length} battalions moving during capture`);
      
      const interruptedBattalions = new Set<string>();
      
      for (const battalionId of movingBattalionsToThisNode) {
        if (interruptedBattalions.has(battalionId)) {
          console.log(`🛑 INTERRUPT SKIP: Battalion ${battalionId} already interrupted`);
          continue;
        }
        
        const interrupted = MovementService.interruptRetargetingMovement(battalionId, battle.battleId);
        if (interrupted) {
          console.log(`🛑 INTERRUPT: Stopping retargeting movement for battalion ${battalionId}`);
          interruptedBattalions.add(battalionId);
        }
      }
      
      if (interruptedBattalions.size > 0) {
        const movementStates = MovementService.getMovementStates(battle.battleId);
        
        for (const battalionId of interruptedBattalions) {
          const movementState = movementStates.get(battalionId);
          const battalion = battle.battalions.find((b: any) => b.id === battalionId);
          
          if (movementState && battalion && movementState.wasInterrupted && movementState.interruptionPosition) {
            console.log(`🚀 INTERRUPTED MOVEMENT: Battalion ${battalionId} will move from interruption coordinates (${movementState.interruptionPosition.x.toFixed(1)}, ${movementState.interruptionPosition.y.toFixed(1)}) to nearest node ${movementState.interruptionPosition.nodeIndex}`);
            
            MovementService.initiateMovementToNearestNode(battalion, movementState.interruptionPosition, battle.battleId);
          }
        }
        
        await battle.save();
        console.log(`💾 MOVEMENTS SAVED: Interrupted battalions now moving to nearest nodes`);
      }
    }
    
    console.log(`⏸️ RETARGETING DEFERRED: Interrupted battalions will retarget after reaching nearest nodes`);
    
    if (affectedBattalionIds.length > 0) {
      console.log(`🎯 IMMEDIATE RETARGETING: ${affectedBattalionIds.length} battalions already at nodes`);
      
      const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
        capturedNodeIndex,
        affectedBattalionIds,
        battle.battalions,
        battle.nodes
      );
      
      if (retargetingResults.length > 0) {
        await BattalionService.updateTargetingResults(battle.battleId, retargetingResults);
        console.log(`🎯 INTEGRATION: Updated targeting for ${retargetingResults.length} battalions already at nodes`);
        await this.initiateRetargetingMovement(battle, retargetingResults, 'NODE_CAPTURE_RETARGETING');
      }
    }
  }

  static async executeBattalionDestructionRetargeting(battle: any, destroyedBattalionId: string, affectedBattalionIds: string[]): Promise<void> {
    console.log(`💀 BATTALION DESTRUCTION RETARGETING: ${destroyedBattalionId} destroyed, ${affectedBattalionIds.length} battalions need new targets`);
    
    if (affectedBattalionIds.length > 0) {
      await this.executeUnifiedRetargeting(battle, affectedBattalionIds, 'BATTALION_DESTRUCTION');
    } else {
      console.log(`💀 BATTALION DESTRUCTION RETARGETING: No battalions were targeting destroyed ${destroyedBattalionId}`);
    }
  }

  static async executeInterruptedBattalionRetargeting(battle: any, battalionId: string): Promise<void> {
    console.log(`🛑 INTERRUPTED BATTALION RETARGETING: Battalion ${battalionId} reached nearest node, now retargeting`);
    
    await this.executeUnifiedRetargeting(battle, [battalionId], 'INTERRUPTED_RECOVERY');
  }

  static async executeMissingTargetRetargeting(battle: any, battalionId: string): Promise<void> {
    console.log(`🎯 MISSING TARGET RETARGETING: Battalion ${battalionId} target not found, retargeting`);
    
    await this.executeUnifiedRetargeting(battle, [battalionId], 'MISSING_TARGET');
  }

  static async initiateRetargetingMovement(battle: any, retargetingResults: any[], source: string = 'REGULAR_RETARGETING'): Promise<void> {
    console.log(`🚀 MOVEMENT [${source}]: Initiating movement for ${retargetingResults.length} retargeted battalions`);
    
    for (const result of retargetingResults) {
      const battalion = battle.battalions.find((b: any) => b.id === result.battalionId);
      if (!battalion) {
        console.log(`🚀 MOVEMENT ERROR: Battalion ${result.battalionId} not found for movement`);
        continue;
      }
      
      console.log(`📊 MOVEMENT INITIATION: ${battalion.owner} ${battalion.type}-type battalion at position node ${battalion.position.nodeIndex} initiating movement to target type: ${result.targetType} at node ${result.newTargetNodeIndex}`);
      
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
      } else {
        console.log(`❌ MOVEMENT ERROR: Failed to create movement state for ${battalion.owner} ${battalion.type}`);
      }
    }
    
    console.log(`🚀 MOVEMENT: Movement initiated for all retargeted battalions`);
  }

  // ============================================================================
  // UNIFIED ATTACK PROCESSING
  // ============================================================================

  static processUnifiedAttack(attacker: IBattalion, target: IBattalion | INode, targetType: 'battalion' | 'node'): boolean {
    console.log(`⚔️ UNIFIED ATTACK: ${attacker.owner} ${attacker.type} attacking ${targetType} target`);
    
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
      console.log(`⏹️ BATTLE ENDED: Skipping attack processing for completed battle ${battle.battleId}`);
      return;
    }

    for (const [battalionId, attackState] of this.getActiveAttacks()) {
      if (Date.now() - attackState.lastAttackTime >= attackState.attackInterval) {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
        
        if (!battalion) {
          console.log(`⚠️ ATTACK PROCESSING: Battalion ${battalionId} not found, removing attack state`);
          this.stopAttacking(battalionId);
          continue;
        }
        
        if (battalion.isDestroyed || battalion.quantity <= 0 || battalion.currentHealth <= 0) {
          console.log(`🚫 BATTALION ATTACK BLOCKED: Attacker ${battalionId} is destroyed/dead (destroyed: ${battalion.isDestroyed}, units: ${battalion.quantity}, health: ${battalion.currentHealth})`);
          this.stopAttacking(battalionId);
          continue;
        }
        
        if (attackState.targetType === 'battalion') {
          const defender = battle.battalions.find((b: IBattalion) => b.id === attackState.targetId);
          
          if (defender && !defender.isDestroyed) {
            const destroyed = this.processUnifiedAttack(battalion, defender, 'battalion');
            attackState.lastAttackTime = Date.now();
            
            if (destroyed) {
              console.log(`💀 BATTALION DESTROYED: ${defender.owner} ${defender.type} eliminated by ${battalion.owner} ${battalion.type}`);
              await battle.save();
              this.queueBattalionDestructionRetargeting(battle.battleId, defender.id);
            }
          } else {
            if (!defender) {
              console.log(`🚫 BATTALION ATTACK FAILED: Target battalion ${attackState.targetId} not found in battle`);
              this.queueMissingTargetRetargeting(battle.battleId, battalionId);
            } else if (defender.isDestroyed) {
              console.log(`🚫 BATTALION ATTACK FAILED: Target ${defender.owner} ${defender.type} is already destroyed`);
              this.queueMissingTargetRetargeting(battle.battleId, battalionId);
            }
            this.stopAttacking(battalionId);
          }
          
        } else {
          const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
          
          if (node && CombatService.canTargetNode(node)) {
            const captured = this.processUnifiedAttack(battalion, node, 'node');
            attackState.lastAttackTime = Date.now();
            
            if (captured) {
              const affectedAttackers = this.getBattalionsAttackingSpecificNode(node.index);
              affectedAttackers.forEach(id => this.stopAttacking(id));
              
              console.log(`🏆 NODE CAPTURED: Node ${node.index} captured by ${node.owner}!, stopping ${affectedAttackers.length} specific attacks`);
              console.log(`📊 CAPTURE DETAILS: Node ${node.index} captured by ${node.owner}, affecting ${affectedAttackers.length} battalions that were attacking this node`);
              
              this.queueRetargetingTask(battle.battleId, node.index, affectedAttackers);
            }
          } else {
            console.log(`🚫 NODE ATTACK FAILED: Node ${attackState.targetNodeIndex} missing or cannot be targeted`);
            this.stopAttacking(battalionId);
          }
        }
        
        await battle.save();
      }
    }
  }
}