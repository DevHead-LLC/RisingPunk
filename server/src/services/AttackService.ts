/**
 * @file AttackService.ts
 * @description Attack state management and coordination with combat system
 * 
 * AUTHORITY: Attack state tracking, starting/stopping attacks, capture triggers
 * OVERLAPS: Node capture detection - PRIMARY retargeting trigger point
 * CONFLICTS: Must stop ONLY attacks on captured node, not all attacks
 * DEPENDENCIES: CombatService for damage/capture, RetargetingService integration, BattalionService updates
 * 
 * PHASE 2 EXTENSION: Added battalion-to-battalion attack support with extended AttackState
 */

import { IBattalion, INode, NodeOwner, RetargetingQueueTask } from '../types/battle';
import { CombatService } from './CombatService';
import { RetargetingService } from './RetargetingService';
import { BattalionService } from './BattalionService';
import { Battle } from '../models/Battle';
import { MovementService } from './MovementService';

// PHASE 2 EXTENSION: AttackState now supports both node and battalion targets
interface AttackState {
  battalionId: string;
  targetNodeIndex: number;        // For node attacks (existing)
  lastAttackTime: number;
  attackInterval: number;         // Based on speed stat
  isAttacking: boolean;
  
  // NEW PHASE 2 PROPERTIES for battalion combat:
  targetType?: 'node' | 'battalion';  // What type of target is being attacked
  targetId?: string;                  // For battalion attacks: target battalion ID
                                     // For node attacks: not used (targetNodeIndex sufficient)
}

export class AttackService {
  private static attackStates = new Map<string, AttackState>();
  
  // NEW: Retargeting queue to handle simultaneous captures and battalion destruction
  private static retargetingQueue: Array<{
    battleId: string,
    capturedNodeIndex?: number,        // For node captures (existing)
    affectedBattalionIds: string[],
    timestamp: number,
    // NEW PHASE 3 PROPERTIES for battalion destruction:
    triggerType?: 'node_capture' | 'battalion_destruction' | 'interrupted_recovery' | 'missing_target',  // What type of event triggered retargeting
    destroyedBattalionId?: string,    // For battalion destruction events
    priority: number                   // FIXED: Priority system (1=high, 2=normal)
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
      isAttacking: true,
      targetType: 'node'  // PHASE 2: Mark as node attack for processing distinction
    };
    
    this.attackStates.set(battalion.id, attackState);
    console.log(`⚔️ ${battalion.owner} ${battalion.type} started attacking node ${targetNodeIndex} (interval: ${attackInterval}ms)`);
  }

  // ============================================================================
  // PHASE 2 BATTALION ATTACK METHODS
  // ============================================================================

  /**
   * Start attacking another battalion (Phase 2 new method)
   * 
   * USAGE: Called from MovementService when battalion arrives at enemy battalion target
   * PATTERN: Similar to startAttacking but targets battalion instead of node
   * 
   * @param attacker - The attacking battalion object (for speed stat access)
   * @param targetId - ID of the target battalion to attack
   */
  static startBattalionAttack(attacker: IBattalion, targetId: string): void {
    // Calculate attack interval based on attacker's speed stat (reuse existing logic)
    const attackInterval = this.calculateAttackInterval(attacker.stats.speed);
    
    const attackState: AttackState = {
      battalionId: attacker.id,
      targetNodeIndex: -1,           // Not used for battalion attacks
      lastAttackTime: Date.now(),
      attackInterval,
      isAttacking: true,
      targetType: 'battalion',       // PHASE 2: Mark as battalion attack for processing
      targetId: targetId             // PHASE 2: Store target battalion ID
    };
    
    this.attackStates.set(attacker.id, attackState);
    console.log(`⚔️ BATTALION ATTACK STARTED: ${attacker.owner} ${attacker.type} (${attacker.id}) → ${targetId} (interval: ${attackInterval}ms based on speed ${attacker.stats.speed})`);
  }

  /**
   * Process a single battalion attack (Phase 2 new method)
   * 
   * COMBAT FLOW:
   * 1. Verify target is still valid (not destroyed)
   * 2. Calculate damage using CombatService
   * 3. Apply damage and check for destruction
   * 4. Update unit count based on remaining health
   * 
   * @param attacker - The attacking battalion
   * @param defender - The defending battalion
   * @returns true if target battalion was destroyed, false if still alive
   */
  static processBattalionAttack(attacker: IBattalion, defender: IBattalion): boolean {
    console.log(`⚔️ BATTALION ATTACK START: ${attacker.owner} ${attacker.type} (${attacker.quantity} units, ${attacker.currentHealth} health) attacking ${defender.owner} ${defender.type} (${defender.quantity} units, ${defender.currentHealth} health)`);
    
    // Verify target can still be attacked (not destroyed)
    if (!CombatService.canTargetBattalion(defender)) {
      console.log(`🚫 BATTALION ATTACK BLOCKED: ${defender.owner} ${defender.type} cannot be targeted (destroyed: ${defender.isDestroyed})`);
      return true; // Target destroyed, stop attacking
    }
    
    // Calculate and apply damage using Phase 1 CombatService methods
    const damage = CombatService.calculateBattalionDamage(attacker, defender);
    const destroyed = CombatService.applyBattalionDamage(defender, damage);
    
    // Comprehensive logging for battle tracking
    console.log(`⚔️ BATTALION ATTACK RESULT: ${attacker.owner} ${attacker.type} deals ${damage} damage to ${defender.owner} ${defender.type} (${defender.currentHealth} health remaining, destroyed: ${destroyed})`);
    
    // Log unit count changes if they occurred (CombatService handles the actual calculation)
    const expectedQuantity = Math.round(defender.currentHealth / defender.baseHealthPerUnit);
    if (defender.currentHealth > 0 && defender.quantity !== expectedQuantity) {
      console.log(`📊 UNIT REDUCTION: ${defender.owner} ${defender.type} unit count updated by CombatService damage application (${defender.quantity} units remaining)`);
    }
    
    console.log(`⚔️ BATTALION ATTACK END: Returning destroyed=${destroyed}`);
    return destroyed;
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
      }
    }

    console.log(`🔍 SELECTIVE: Found ${attackers.length} battalions attacking node ${nodeIndex}`);
    return attackers;
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
   * Clear attack state for a specific battalion (useful for destroyed battalions)
   */
  static clearBattalionAttacks(battalionId: string): void {
    this.attackStates.delete(battalionId);
    console.log(`🧹 CLEARED ATTACKS: Removed attack state for battalion ${battalionId}`);
  }

  /**
   * Queue retargeting task for processing
   */
  static queueRetargetingTask(battleId: string, capturedNodeIndex: number, affectedBattalionIds: string[]): void {
    const task = {
      battleId,
      capturedNodeIndex,
      affectedBattalionIds,
      timestamp: Date.now(),
      triggerType: 'node_capture' as const,  // Mark as node capture
      priority: 2 // FIXED: Set priority for node capture (lower than battalion destruction)
    };
    
    this.retargetingQueue.push(task);
    console.log(`📋 RETARGETING QUEUE: Added task for node ${capturedNodeIndex} capture (queue size: ${this.retargetingQueue.length})`);
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processRetargetingQueue();
    }
  }

  /**
   * PHASE 3: Queue retargeting for battalions that were targeting a destroyed battalion
   * 
   * USAGE: Called when a battalion is destroyed to retarget any battalions attacking it
   * PATTERN: Similar to queueRetargetingTask but for battalion destruction events
   * FIXED: Immediately clear attack states for destroyed battalions
   * 
   * @param battleId - The battle ID where destruction occurred
   * @param destroyedBattalionId - ID of the battalion that was destroyed
   */
  static queueBattalionDestructionRetargeting(battleId: string, destroyedBattalionId: string): void {
    // FIXED: Immediately clear attack state for the destroyed battalion
    this.clearBattalionAttacks(destroyedBattalionId);
    
    // Find all battalions that were targeting the destroyed battalion
    const affectedBattalions: string[] = [];
    
    for (const [battalionId, attackState] of this.attackStates) {
      if (attackState.targetType === 'battalion' && attackState.targetId === destroyedBattalionId) {
        affectedBattalions.push(battalionId);
        console.log(`🎯 DESTRUCTION AFFECTED: Battalion ${battalionId} was targeting destroyed ${destroyedBattalionId}`);
        // Stop attacking the destroyed target immediately
        this.stopAttacking(battalionId);
      }
    }
    
    if (affectedBattalions.length > 0) {
      const task = {
        battleId,
        affectedBattalionIds: affectedBattalions,
        timestamp: Date.now(),
        triggerType: 'battalion_destruction' as const,  // Mark as battalion destruction
        destroyedBattalionId,
        priority: 1 // FIXED: Set priority for battalion destruction
      };
      
      this.retargetingQueue.push(task);
      console.log(`📋 DESTRUCTION RETARGETING: ${affectedBattalions.length} battalions need new targets after ${destroyedBattalionId} destruction (queue size: ${this.retargetingQueue.length})`);
      
      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.processRetargetingQueue();
      }
    } else {
      console.log(`📋 DESTRUCTION RETARGETING: No battalions were targeting destroyed ${destroyedBattalionId}`);
    }
  }

  /**
   * NEW: Queue retargeting for a single interrupted battalion that reached its nearest node
   */
  static queueInterruptedBattalionRetargeting(battleId: string, battalionId: string): void {
    console.log(`📋 INTERRUPTED RETARGETING: Queueing retargeting for recovered battalion ${battalionId}`);
    
    this.retargetingQueue.push({
      battleId,
      triggerType: 'interrupted_recovery',
      affectedBattalionIds: [battalionId],
      capturedNodeIndex: -1, // Not applicable for recovery retargeting
      timestamp: Date.now(),
      priority: 1 // Normal priority
    });
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processRetargetingQueue();
    }
  }

  /**
   * NEW: Process retargeting queue sequentially to avoid race conditions
   * PHASE 3: Now handles both node capture and battalion destruction retargeting
   */
  static async processRetargetingQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    console.log(`⚙️ RETARGETING QUEUE: Starting sequential processing`);
    
    // Sort queue by priority (1=high, 2=normal)
    this.retargetingQueue.sort((a, b) => a.priority - b.priority);

    while (this.retargetingQueue.length > 0) {
      const task = this.retargetingQueue.shift()!;
      
      // Get fresh battle state for each task
      const battle = await Battle.findOne({ battleId: task.battleId });
      if (!battle) {
        console.log(`❌ RETARGETING ERROR: Battle ${task.battleId} not found`);
        continue;
      }
      
      try {
                 if (task.triggerType === 'node_capture') {
           console.log(`⚙️ RETARGETING QUEUE: Processing node capture ${task.capturedNodeIndex} (${task.affectedBattalionIds?.length || 0} battalions)`);
           await this.executeRetargetingTask(battle, task.capturedNodeIndex!, task.affectedBattalionIds!);
         } else if (task.triggerType === 'battalion_destruction') {
           console.log(`⚙️ RETARGETING QUEUE: Processing battalion destruction ${task.destroyedBattalionId} (${task.affectedBattalionIds?.length || 0} battalions)`);
           await this.executeBattalionDestructionRetargeting(battle, task.destroyedBattalionId!, task.affectedBattalionIds!);
         } else if (task.triggerType === 'interrupted_recovery') {
           console.log(`⚙️ RETARGETING QUEUE: Processing interrupted recovery ${task.affectedBattalionIds[0]}`);
           await this.executeInterruptedBattalionRetargeting(battle, task.affectedBattalionIds[0]);
                 } else if (task.triggerType === 'missing_target') {
           console.log(`⚙️ RETARGETING QUEUE: Processing missing target retargeting ${task.affectedBattalionIds[0]}`);
           await this.executeMissingTargetRetargeting(battle, task.affectedBattalionIds[0]);
                 } else {
           console.log(`❌ RETARGETING ERROR: Unknown trigger type ${task.triggerType}`);
         }
       } catch (error) {
         console.log(`❌ RETARGETING ERROR: Failed to process ${task.triggerType}:`, error);
      }
      
      // Small delay between tasks to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.isProcessingQueue = false;
    console.log(`⚙️ RETARGETING QUEUE: Finished processing all tasks`);
  }

  /**
   * NEW: Get battalions currently moving to a specific target node
   */
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

  /**
   * NEW: Execute individual retargeting task
   */
  static async executeRetargetingTask(battle: any, capturedNodeIndex: number, affectedBattalionIds: string[]): Promise<void> {
    console.log(`🎯 EXECUTING: Retargeting for node ${capturedNodeIndex} capture`);
    
    // FIXED: Only interrupt battalions moving to the captured node
    const movingBattalionsToThisNode = this.getMovingBattalionsTargetingNode(battle.battleId, capturedNodeIndex);
    if (movingBattalionsToThisNode.length > 0) {
      console.log(`🛑 CAPTURE INTERRUPT: ${movingBattalionsToThisNode.length} battalions moving during capture`);
      
      // FIXED: Track interrupted battalions to prevent duplicates
      const interruptedBattalions = new Set<string>();
      
      for (const battalionId of movingBattalionsToThisNode) {
        // Skip if already interrupted
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
      
      // CRITICAL FIX: Update battalion positions in battle object with interruption positions
      // This must happen BEFORE retargeting so it uses correct positions, not stale data
      if (interruptedBattalions.size > 0) {
        const movementStates = MovementService.getMovementStates(battle.battleId);
        
        for (const battalionId of interruptedBattalions) {
          const movementState = movementStates.get(battalionId);
          const battalion = battle.battalions.find((b: any) => b.id === battalionId);
          
          if (movementState && battalion && movementState.wasInterrupted && movementState.interruptionPosition) {
            // FIXED: Don't instantly sync position to node - initiate movement to nearest node instead
            console.log(`🚀 INTERRUPTED MOVEMENT: Battalion ${battalionId} will move from interruption coordinates (${movementState.interruptionPosition.x.toFixed(1)}, ${movementState.interruptionPosition.y.toFixed(1)}) to nearest node ${movementState.interruptionPosition.nodeIndex}`);
            
            // Initiate movement from interruption position to nearest node
            MovementService.initiateMovementToNearestNode(battalion, movementState.interruptionPosition, battle.battleId);
          }
        }
        
        // Save battle state after setting up movements
        await battle.save();
        console.log(`💾 MOVEMENTS SAVED: Interrupted battalions now moving to nearest nodes`);
      }
    }
    
    // REMOVED: Don't do retargeting immediately - it will happen when battalions reach their nearest nodes
    console.log(`⏸️ RETARGETING DEFERRED: Interrupted battalions will retarget after reaching nearest nodes`);
    
    // Only retarget battalions that were already at nodes (not moving)
    if (affectedBattalionIds.length > 0) {
      console.log(`🎯 IMMEDIATE RETARGETING: ${affectedBattalionIds.length} battalions already at nodes`);
      
      // Use RetargetingService to find new targets (for battalions already at nodes)
      const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
        capturedNodeIndex,
        affectedBattalionIds,  // Only battalions that were already at nodes
        battle.battalions,
        battle.nodes
      );
      
      // Update battalion targeting results (direct integration - no conversion)
      if (retargetingResults.length > 0) {
        // Integrate with BattalionService to update targeting (direct pass-through)
        await BattalionService.updateTargetingResults(battle.battleId, retargetingResults);
        
        console.log(`🎯 INTEGRATION: Updated targeting for ${retargetingResults.length} battalions already at nodes`);
        
        // NEW: Initiate movement for retargeted battalions
        await this.initiateRetargetingMovement(battle, retargetingResults, 'NODE_CAPTURE_RETARGETING');
      }
    }
  }

  /**
   * PHASE 3: Execute battalion destruction retargeting
   * 
   * USAGE: Called when a battalion is destroyed to retarget affected battalions
   * PATTERN: Similar to executeRetargetingTask but for battalion destruction events
   * FIXED: Get fresh battle state and filter out destroyed battalions before retargeting
   * 
   * @param battle - The battle object
   * @param destroyedBattalionId - ID of the destroyed battalion
   * @param affectedBattalionIds - IDs of battalions that need retargeting
   */
  static async executeBattalionDestructionRetargeting(battle: any, destroyedBattalionId: string, affectedBattalionIds: string[]): Promise<void> {
    console.log(`🎯 EXECUTING: Retargeting for battalion destruction ${destroyedBattalionId}`);
    console.log(`🎯 DESTRUCTION START: Battalion ${destroyedBattalionId} destroyed, ${affectedBattalionIds.length} battalions affected`);
    
    // FIXED: Get fresh battle state to ensure isDestroyed flags are up to date
    const freshBattle = await Battle.findOne({ battleId: battle.battleId });
    if (!freshBattle) {
      console.log(`❌ RETARGETING ERROR: Battle ${battle.battleId} not found for destruction retargeting`);
      return;
    }
    
    // FIXED: Filter out destroyed battalions from the affected list
    const aliveAffectedBattalions = affectedBattalionIds.filter(battalionId => {
      const battalion = freshBattle.battalions.find((b: any) => b.id === battalionId);
      if (!battalion) {
        console.log(`🎯 RETARGETING WARNING: Battalion ${battalionId} not found in fresh battle state`);
        return false;
      }
      if (battalion.isDestroyed || battalion.currentHealth <= 0 || battalion.quantity <= 0) {
        console.log(`🎯 RETARGETING SKIP: Battalion ${battalionId} is destroyed, skipping retargeting`);
        return false;
      }
      return true;
    });
    
    if (aliveAffectedBattalions.length === 0) {
      console.log(`🎯 DESTRUCTION: No alive battalions need retargeting after ${destroyedBattalionId} destruction`);
      return;
    }
    
    console.log(`🎯 DESTRUCTION: ${aliveAffectedBattalions.length} alive battalions need retargeting`);
    
    // No movement interruption needed for destruction - affected battalions have already stopped attacking
    // Use RetargetingService to find new targets for affected battalions
    // NOTE: This reuses the same retargeting logic as node captures
    const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
      -1, // No specific node involved in destruction
      aliveAffectedBattalions,
      freshBattle.battalions,
      freshBattle.nodes
    );
    
    console.log(`🎯 DESTRUCTION END: ${retargetingResults.length}/${aliveAffectedBattalions.length} battalions retargeted`);
    
    // Update battalion targeting results (same integration as node captures)
    if (retargetingResults.length > 0) {
      // Integrate with BattalionService to update targeting
      await BattalionService.updateTargetingResults(freshBattle.battleId, retargetingResults);
      
      console.log(`🎯 INTEGRATION: Updated targeting for ${retargetingResults.length} battalions`);
      
      // Initiate movement for retargeted battalions
      await this.initiateRetargetingMovement(freshBattle, retargetingResults, 'BATTALION_DESTRUCTION_RETARGETING');
    } else {
      console.log(`🎯 DESTRUCTION: No valid retargeting options found for affected battalions`);
    }
  }

  /**
   * NEW: Initiate movement for retargeted battalions
   */
  static async initiateRetargetingMovement(battle: any, retargetingResults: any[], source: string = 'REGULAR_RETARGETING'): Promise<void> {
    console.log(`🚀 MOVEMENT [${source}]: Initiating movement for ${retargetingResults.length} retargeted battalions`);
    
    for (const result of retargetingResults) {
      const battalion = battle.battalions.find((b: any) => b.id === result.battalionId);
      if (!battalion) {
        console.log(`🚀 MOVEMENT ERROR: Battalion ${result.battalionId} not found for movement`);
        continue;
      }
      
      // DETAILED LOGGING: Show battalion position and target details
      console.log(`📊 MOVEMENT INITIATION: ${battalion.owner} ${battalion.type}-type battalion at position node ${battalion.position.nodeIndex} initiating movement to target type: ${result.targetType} at node ${result.newTargetNodeIndex}`);
      
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
        result.pathToTarget,
        battle,  // Pass battle context for same-node targeting
        'INTERRUPTED_BATTALION_RETARGETING' // NEW: Source tracking for debugging
      );
      
      // Store the movement state so it can be processed by the update loop
      if (movementState) {
        const battleMovementStates = MovementService.getMovementStates(battle.battleId);
        battleMovementStates.set(battalion.id, movementState);
      } else {
        console.log(`❌ MOVEMENT ERROR: Failed to create movement state for ${battalion.owner} ${battalion.type}`);
      }
    }
    
    console.log(`🚀 MOVEMENT: Movement initiated for all retargeted battalions`);
  }

  /**
   * NEW: Execute individual retargeting task for an interrupted battalion that reached its nearest node
   */
  static async executeInterruptedBattalionRetargeting(battle: any, battalionId: string): Promise<void> {
    console.log(`🎯 EXECUTING: Retargeting for interrupted battalion ${battalionId}`);
    
    const battalion = battle.battalions.find((b: any) => b.id === battalionId);
    if (!battalion) {
      console.log(`❌ RETARGETING ERROR: Battalion ${battalionId} not found for interrupted retargeting`);
      return;
    }

    // FIXED: Use preserved originalInterruptionPosition from movement state
    const movementState = MovementService.getMovementStates(battle.battleId).get(battalionId);
    if (!movementState || !movementState.originalInterruptionPosition || movementState.originalInterruptionPosition.nodeIndex === undefined) {
      console.log(`❌ RETARGETING ERROR: Movement state for ${battalionId} not found or no original interruption position`);
      console.log(`🔍 DEBUG: Movement state exists: ${!!movementState}, originalInterruptionPosition: ${JSON.stringify(movementState?.originalInterruptionPosition)}`);
      return;
    }

    const interruptedNodeIndex = movementState.originalInterruptionPosition.nodeIndex;
    
    // CRITICAL FIX: Ensure battalion position in battle object matches current reality
    console.log(`🔍 POSITION CHECK: Battalion ${battalionId} battle object shows node ${battalion.position.nodeIndex}, movement state shows node ${movementState.targetPosition.nodeIndex}`);
    
    if (battalion.position.nodeIndex !== movementState.targetPosition.nodeIndex) {
      console.log(`🔄 POSITION SYNC: Updating battalion ${battalionId} position from stale node ${battalion.position.nodeIndex} to current node ${movementState.targetPosition.nodeIndex}`);
      battalion.position.nodeIndex = movementState.targetPosition.nodeIndex;
      battalion.position.x = movementState.targetPosition.x;
      battalion.position.y = movementState.targetPosition.y;
      await battle.save();
      console.log(`💾 POSITION UPDATED: Battalion ${battalionId} position synced to battle object`);
    }
    
    console.log(`🎯 INTERRUPTED RETARGETING: Battalion ${battalionId} recovered from interruption at node ${interruptedNodeIndex}, currently at node ${battalion.position.nodeIndex}`);

    // Use RetargetingService to find new targets for the battalion
    const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
      interruptedNodeIndex,
      [battalionId],
      battle.battalions,
      battle.nodes
    );

    if (retargetingResults.length > 0) {
      console.log(`🎯 INTERRUPTED RETARGETING: ${retargetingResults.length} new targets found for ${battalionId}`);
      
      // Integrate with BattalionService to update targeting
      await BattalionService.updateTargetingResults(battle.battleId, retargetingResults);
      
      // Initiate movement for retargeted battalions
      await this.initiateRetargetingMovement(battle, retargetingResults, 'INTERRUPTED_BATTALION_RETARGETING');
    } else {
      console.log(`🎯 INTERRUPTED RETARGETING: No valid retargeting options found for ${battalionId}`);
    }
  }

  /**
   * NEW: Queue retargeting for battalion that arrived but couldn't find its target
   */
  static queueMissingTargetRetargeting(battleId: string, battalionId: string): void {
    const task = {
      battleId: battleId,
      affectedBattalionIds: [battalionId], // Use array format to match existing queue type
      timestamp: Date.now(),
      triggerType: 'missing_target' as const,
      priority: 2 // Normal priority for missing target retargeting
    };
    
    this.retargetingQueue.push(task);
    console.log(`📋 MISSING TARGET RETARGETING: Queueing retargeting for battalion ${battalionId} (queue size: ${this.retargetingQueue.length})`);
    
    // Process the queue
    this.processRetargetingQueue();
  }

  /**
   * NEW: Execute retargeting for battalion that couldn't find its target on arrival
   */
  static async executeMissingTargetRetargeting(battle: any, battalionId: string): Promise<void> {
    console.log(`🎯 EXECUTING: Retargeting for missing target battalion ${battalionId}`);
    
    const battalion = battle.battalions.find((b: any) => b.id === battalionId);
    if (!battalion) {
      console.log(`❌ RETARGETING ERROR: Battalion ${battalionId} not found for missing target retargeting`);
      return;
    }

    if (battalion.isDestroyed || battalion.currentHealth <= 0) {
      console.log(`🎯 RETARGETING SKIP: Battalion ${battalionId} is destroyed, skipping retargeting`);
      return;
    }

    console.log(`🎯 MISSING TARGET: Battalion ${battalion.owner} ${battalion.type} at node ${battalion.position.nodeIndex} needs new target`);

    // Use RetargetingService to find new targets for the battalion
    const retargetingResults = RetargetingService.retargetBattalionsAfterCapture(
      battalion.position.nodeIndex, // Use current position as reference
      [battalionId],
      battle.battalions,
      battle.nodes
    );

    if (retargetingResults.length > 0) {
      console.log(`🎯 MISSING TARGET RETARGETING: ${retargetingResults.length} new targets found for ${battalionId}`);
      
      // Integrate with BattalionService to update targeting
      await BattalionService.updateTargetingResults(battle.battleId, retargetingResults);
      
      // Initiate movement for retargeted battalions
      await this.initiateRetargetingMovement(battle, retargetingResults, 'MISSING_TARGET_RETARGETING');
    } else {
      console.log(`🎯 MISSING TARGET RETARGETING: No valid retargeting options found for ${battalionId}`);
    }
  }

  /**
   * Process all active attacks (moved from MovementService)
   * PHASE 2 ENHANCEMENT: Now handles both node and battalion attacks
   * FIXED: Added battle end check and immediate cleanup of destroyed battalions
   */
  static async processActiveAttacks(battle: any): Promise<void> {
    // FIXED: Check if battle has ended - don't process attacks after battle end
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
        
        // FIXED: Check if attacker is destroyed BEFORE processing any attacks
        if (battalion.isDestroyed || battalion.quantity <= 0 || battalion.currentHealth <= 0) {
          console.log(`🚫 BATTALION ATTACK BLOCKED: Attacker ${battalionId} is destroyed/dead (destroyed: ${battalion.isDestroyed}, units: ${battalion.quantity}, health: ${battalion.currentHealth})`);
          this.stopAttacking(battalionId);
          continue;
        }
        
        // PHASE 2: Handle different attack types
        if (attackState.targetType === 'battalion') {
          // ============================================
          // BATTALION ATTACK PROCESSING (NEW PHASE 2)
          // ============================================
          // FIXED: Removed redundant battalion state check since we already checked above
          const defender = battle.battalions.find((b: IBattalion) => b.id === attackState.targetId);
          
          if (defender && !defender.isDestroyed) {
            const destroyed = this.processBattalionAttack(battalion, defender);
            
            // Update last attack time for continued attacks
            attackState.lastAttackTime = Date.now();
            
            if (destroyed) {
              console.log(`💀 BATTALION DESTROYED: ${defender.owner} ${defender.type} eliminated by ${battalion.owner} ${battalion.type}`);
              
              // CRITICAL FIX: Immediately save battle state to persist isDestroyed flag
              await battle.save();
              
              // PHASE 3: Queue retargeting for battalions that were targeting the destroyed battalion
              this.queueBattalionDestructionRetargeting(battle.battleId, defender.id);
            }
          } else {
            // Target battalion missing, destroyed, or attacker issues
            if (!defender) {
              console.log(`🚫 BATTALION ATTACK FAILED: Target battalion ${attackState.targetId} not found in battle`);
            } else if (defender.isDestroyed) {
              console.log(`🚫 BATTALION ATTACK FAILED: Target ${defender.owner} ${defender.type} is already destroyed`);
            }
            this.stopAttacking(battalionId);
          }
          
        } else {
          // ============================================
          // NODE ATTACK PROCESSING (EXISTING LOGIC)  
          // ============================================
          const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
          
          if (node && CombatService.canTargetNode(node)) {
            const captured = this.processAttack(battalion, node);
            
            // Update last attack time
            attackState.lastAttackTime = Date.now();
            
            if (captured) {
              // Get ONLY battalions attacking this specific captured node
              const affectedAttackers = this.getBattalionsAttackingSpecificNode(node.index);
              
              // Stop attacks for ONLY these specific battalions
              affectedAttackers.forEach(id => this.stopAttacking(id));
              
              console.log(`🏆 NODE CAPTURED: Node ${node.index} captured by ${node.owner}!, stopping ${affectedAttackers.length} specific attacks`);
              
              // DETAILED LOGGING: Show which battalions are affected by the capture
              console.log(`📊 CAPTURE DETAILS: Node ${node.index} captured by ${node.owner}, affecting ${affectedAttackers.length} battalions that were attacking this node`);
              
              // NEW: Add to retargeting queue instead of immediate processing
              this.queueRetargetingTask(battle.battleId, node.index, affectedAttackers);
            }
          } else {
            // Target node missing or can't be targeted
            console.log(`🚫 NODE ATTACK FAILED: Node ${attackState.targetNodeIndex} missing or cannot be targeted`);
            this.stopAttacking(battalionId);
          }
        }
        
        // Save the updated battle state
        await battle.save();
      }
    }
  }
} 