/**
 * @file AttackService.ts
 * @description Attack state management and coordination with combat system
 * 
 * AUTHORITY: Attack state tracking, starting/stopping attacks, capture triggers
 * OVERLAPS: Node capture detection - PRIMARY retargeting trigger point
 * CONFLICTS: Must stop ONLY attacks on captured node, not all attacks
 * DEPENDENCIES: CombatService for damage/capture, RetargetingService integration, BattalionService updates
 */

import { IBattalion, INode, NodeOwner } from '../types/battle';
import { CombatService } from './CombatService';
import { RetargetingService } from './RetargetingService';
import { BattalionService } from './BattalionService';
import { Battle } from '../models/Battle';

interface AttackState {
  battalionId: string;
  targetNodeIndex: number;
  lastAttackTime: number;
  attackInterval: number; // Based on speed stat
  isAttacking: boolean;
}

export class AttackService {
  private static attackStates = new Map<string, AttackState>();
  
  // NEW: Retargeting queue to handle simultaneous captures
  private static retargetingQueue: Array<{
    battleId: string,
    capturedNodeIndex: number,
    affectedBattalionIds: string[],
    timestamp: number
  }> = [];

  private static isProcessingQueue: boolean = false;
  
  /**
   * Calculate attack interval from speed stat
   * Speed 1-10, where 10 is fastest
   * Example: speed 10 = 1000ms, speed 5 = 2000ms
   */
  static calculateAttackInterval(speedStat: number): number {
    return 3000 - (speedStat * 200); // 1000ms to 2800ms range
  }
  
  /**
   * Start periodic attacking for a battalion
   */
  static startAttacking(battalion: IBattalion, targetNodeIndex: number): void {
    const attackInterval = this.calculateAttackInterval(battalion.stats.speed);
    
    const attackState: AttackState = {
      battalionId: battalion.id,
      targetNodeIndex,
      lastAttackTime: Date.now(),
      attackInterval,
      isAttacking: true
    };
    
    this.attackStates.set(battalion.id, attackState);
    console.log(`⚔️ ${battalion.owner} ${battalion.type} started attacking node ${targetNodeIndex} (interval: ${attackInterval}ms)`);
  }
  
  /**
   * Stop attacking for a battalion (called when node captured)
   */
  static stopAttacking(battalionId: string): void {
    const attackState = this.attackStates.get(battalionId);
    if (attackState) {
      attackState.isAttacking = false;
      this.attackStates.delete(battalionId);
      console.log(`🛑 Battalion ${battalionId} stopped attacking`);
    }
  }
  
  /**
   * Process a single attack (reuse CombatService)
   * Returns true if node was captured
   */
  static processAttack(battalion: IBattalion, node: INode): boolean {
    if (!CombatService.canTargetNode(node)) {
      return false;
    }
    
    const damage = CombatService.calculateTugOfWarDamage(battalion);
    const captured = CombatService.applyTugOfWarDamage(node, damage, battalion.owner);
    
    console.log(`⚔️ ${battalion.owner} ${battalion.type} dealt ${damage} damage to node ${node.index} (progress: ${node.tugOfWarProgress}%)`);
    
    return captured;
  }
  
  /**
   * Get all battalions attacking a specific node (PHASE 1: Selective identification)
   */
  static getBattalionsAttackingSpecificNode(nodeIndex: number): string[] {
    // Return ONLY battalions attacking this specific node
    // This ensures we don't stop ALL attacks when one node is captured
    console.log(`🔍 SELECTIVE: Finding battalions attacking node ${nodeIndex} specifically`);

    const attackers: string[] = [];
    for (const [battalionId, attackState] of this.attackStates) {
      if (attackState.isAttacking && attackState.targetNodeIndex === nodeIndex) {
        attackers.push(battalionId);
        console.log(`🔍 SELECTIVE: Battalion ${battalionId} is attacking node ${nodeIndex}`);
      }
    }

    console.log(`🔍 SELECTIVE: Found ${attackers.length} battalions attacking node ${nodeIndex}`);
    return attackers;
  }

  /**
   * Get all battalions attacking a specific node (DEPRECATED: Use getBattalionsAttackingSpecificNode)
   */
  static getBattalionsAttackingNode(nodeIndex: number): string[] {
    // Maintain backward compatibility - delegate to new selective method
    return this.getBattalionsAttackingSpecificNode(nodeIndex);
  }
  
  /**
   * Get all active attack states
   */
  static getActiveAttacks(): Map<string, AttackState> {
    return new Map(this.attackStates);
  }
  
  /**
   * Check if a battalion is currently attacking
   */
  static isAttacking(battalionId: string): boolean {
    const attackState = this.attackStates.get(battalionId);
    return attackState?.isAttacking || false;
  }
  
  /**
   * Get attack state for a battalion
   */
  static getAttackState(battalionId: string): AttackState | undefined {
    return this.attackStates.get(battalionId);
  }
  
  /**
   * Clear all attack states (for battle cleanup)
   */
  static clearAllAttacks(): void {
    this.attackStates.clear();
  }

  /**
   * NEW: Add retargeting task to queue for sequential processing
   */
  static queueRetargetingTask(battleId: string, capturedNodeIndex: number, affectedBattalionIds: string[]): void {
    const task = {
      battleId,
      capturedNodeIndex,
      affectedBattalionIds,
      timestamp: Date.now()
    };
    
    this.retargetingQueue.push(task);
    console.log(`📋 RETARGETING QUEUE: Added task for node ${capturedNodeIndex} capture (queue size: ${this.retargetingQueue.length})`);
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processRetargetingQueue();
    }
  }

  /**
   * NEW: Process retargeting queue sequentially to avoid race conditions
   */
  static async processRetargetingQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    console.log(`⚙️ RETARGETING QUEUE: Starting sequential processing`);
    
    while (this.retargetingQueue.length > 0) {
      const task = this.retargetingQueue.shift()!;
      
      console.log(`⚙️ RETARGETING QUEUE: Processing node ${task.capturedNodeIndex} capture (${task.affectedBattalionIds.length} battalions)`);
      
      try {
        // FIXED: Get fresh battle state to ensure node ownership is updated
        const battle = await Battle.findOne({ battleId: task.battleId });
        if (battle) {
          await this.executeRetargetingTask(battle, task.capturedNodeIndex, task.affectedBattalionIds);
        }
      } catch (error) {
        console.error(`❌ RETARGETING QUEUE: Error processing task for node ${task.capturedNodeIndex}:`, error);
      }
      
      // Small delay between tasks to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.isProcessingQueue = false;
    console.log(`⚙️ RETARGETING QUEUE: Finished processing all tasks`);
  }

  /**
   * NEW: Get battalions currently in retargeting movement
   */
  static getMovingBattalionsInBattle(battleId: string): string[] {
    const { MovementService } = require('./MovementService');
    const movementStates = MovementService.getMovementStates(battleId);
    const movingBattalions: string[] = [];
    
    for (const [battalionId, movementState] of movementStates) {
      if (movementState.movementStatus === 'moving' && 
          movementState.movementType === 'retargeting' && 
          movementState.isInterruptible) {
        movingBattalions.push(battalionId);
      }
    }
    
    return movingBattalions;
  }

  /**
   * NEW: Execute individual retargeting task
   */
  static async executeRetargetingTask(battle: any, capturedNodeIndex: number, affectedBattalionIds: string[]): Promise<void> {
    console.log(`🎯 EXECUTING: Retargeting for node ${capturedNodeIndex} capture`);
    
    // NEW: Check for moving battalions and interrupt them
    const movingBattalions = this.getMovingBattalionsInBattle(battle.battleId);
    if (movingBattalions.length > 0) {
      console.log(`🛑 CAPTURE INTERRUPT: ${movingBattalions.length} battalions moving during capture`);
      for (const battalionId of movingBattalions) {
        const { MovementService } = require('./MovementService');
        const interrupted = MovementService.interruptRetargetingMovement(battalionId, battle.battleId);
        if (interrupted) {
          console.log(`🛑 CAPTURE INTERRUPT: Stopped movement for battalion ${battalionId}`);
        }
      }
    }
    
    // Use RetargetingService to find new targets
    const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
      capturedNodeIndex,
      affectedBattalionIds,
      battle.battalions,
      battle.nodes
    );
    
    // Update battalion targeting results
    if (retargetingResults.length > 0) {
      const targetingResults = retargetingResults.map(result => ({
        battalionId: result.battalionId,
        targetNode: result.newTargetNodeIndex,
        networkPath: result.pathToTarget
      }));
      
      // Integrate with BattalionService to update targeting
      await BattalionService.updateTargetingResults(battle.battleId, targetingResults);
      
      console.log(`🎯 INTEGRATION: Updated targeting for ${retargetingResults.length} battalions`);
      
      // NEW: Initiate movement for retargeted battalions
      await this.initiateRetargetingMovement(battle, retargetingResults);
    }
  }

  /**
   * NEW: Initiate movement for retargeted battalions
   */
  static async initiateRetargetingMovement(battle: any, retargetingResults: any[]): Promise<void> {
    console.log(`🚀 MOVEMENT: Initiating movement for ${retargetingResults.length} retargeted battalions`);
    
    for (const result of retargetingResults) {
      const battalion = battle.battalions.find((b: any) => b.id === result.battalionId);
      if (!battalion) {
        console.log(`🚀 MOVEMENT ERROR: Battalion ${result.battalionId} not found for movement`);
        continue;
      }
      
      console.log(`🚀 MOVEMENT: Starting retargeting movement for ${battalion.owner} ${battalion.type} (${result.currentNodeIndex} → ${result.newTargetNodeIndex})`);
      
      // Use MovementService to start retargeting movement
      const { MovementService } = require('./MovementService');
      const { ScreenDimensionService } = require('./ScreenDimensionService');
      
      // Get screen dimensions for the battle
      const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battle.battleId);
      
      const movementState = MovementService.initiateMovement(
        battalion,
        result.newTargetNodeIndex,
        screenDimensions.width,
        screenDimensions.height,
        'retargeting',
        result.pathToTarget
      );
      
      // Store the movement state so it can be processed by the update loop
      if (movementState) {
        const battleMovementStates = MovementService.getMovementStates(battle.battleId);
        battleMovementStates.set(battalion.id, movementState);
        console.log(`💾 MOVEMENT STATE: Stored retargeting movement for ${battalion.owner} ${battalion.type}`);
      } else {
        console.log(`❌ MOVEMENT ERROR: Failed to create movement state for ${battalion.owner} ${battalion.type}`);
      }
    }
    
    console.log(`🚀 MOVEMENT: Movement initiated for all retargeted battalions`);
  }

  /**
   * Process all active attacks (moved from MovementService)
   */
  static async processActiveAttacks(battle: any): Promise<void> {
    for (const [battalionId, attackState] of this.getActiveAttacks()) {
      if (Date.now() - attackState.lastAttackTime >= attackState.attackInterval) {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
        const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
        
        if (battalion && node && CombatService.canTargetNode(node)) {
          const captured = this.processAttack(battalion, node);
          
          // Update last attack time
          attackState.lastAttackTime = Date.now();
          
          if (captured) {
            // Get ONLY battalions attacking this specific captured node
            const affectedAttackers = this.getBattalionsAttackingSpecificNode(node.index);
            
            // Stop attacks for ONLY these specific battalions
            affectedAttackers.forEach(id => this.stopAttacking(id));
            
            console.log(`🏆 NODE CAPTURED: Node ${node.index} captured by ${node.owner}!, stopping ${affectedAttackers.length} specific attacks`);
            
            // NEW: Add to retargeting queue instead of immediate processing
            this.queueRetargetingTask(battle.battleId, node.index, affectedAttackers);
          }
          
          // Save the updated battle state
          await battle.save();
        }
      }
    }
  }
} 