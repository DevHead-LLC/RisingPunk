import { calculateNodePositions } from '../services/NodeService';
import { TargetingService } from './TargetingService';
import { IBattalion, INode } from '../types/battle';
import { MovementState } from '../../../mobile/src/types/battleTypes';
import { CombatService } from './CombatService';
import { AttackService } from './AttackService';
import { BattalionPositionService } from './BattalionPositionService';

// Movement configuration constants (single source of truth for movement timing)
const MOVEMENT_CONFIG = {
  BASE_MOVEMENT_TIME_MS: 20000,  // Base movement time in milliseconds (20 seconds)
} as const;

interface Position {
  x: number;
  y: number;
}

export class MovementService {
  private static movementStates: Map<string, Map<string, MovementState>> = new Map(); // battleId -> battalionId -> MovementState
  private static movementIntervals: Map<string, NodeJS.Timeout> = new Map(); // battleId -> movement interval

  /**
   * Get current movement states for a specific battle
   */
  static getMovementStates(battleId: string): Map<string, MovementState> {
    return this.movementStates.get(battleId) || new Map();
  }

  /**
   * Store screen dimensions for a battle (called when client requests battle state)
   */
  static setBattleScreenDimensions(battleId: string, width: number, height: number): void {
    BattalionPositionService.setBattleScreenDimensions(battleId, width, height);
  }

  /**
   * Get screen dimensions for a battle (for movement calculations)
   */
  static getBattleScreenDimensions(battleId: string): { width: number; height: number } {
    return BattalionPositionService.getBattleScreenDimensions(battleId);
  }

  /**
   * Start smooth movement updates (separate from timer) at 100ms intervals
   */
  static startMovementUpdates(battleId: string, updateCallback: (battleId: string) => Promise<void>): void {
    // Don't start if already running
    if (this.movementIntervals.has(battleId)) {
      return;
    }

    console.log(`🏃 STARTING MOVEMENT UPDATES for battle ${battleId} (100ms intervals)`);

    const movementInterval = setInterval(async () => {
      await updateCallback(battleId);
    }, 100); // 100ms for smooth movement

    this.movementIntervals.set(battleId, movementInterval);
  }

  /**
   * Stop movement updates for a battle
   */
  static stopMovementUpdates(battleId: string): void {
    const interval = this.movementIntervals.get(battleId);
    if (interval) {
      clearInterval(interval);
      this.movementIntervals.delete(battleId);
      console.log(`⏹️ STOPPED MOVEMENT UPDATES for battle ${battleId}`);
    }
    
    // Clean up screen dimensions and movement states for this battle
    BattalionPositionService.clearBattleScreenDimensions(battleId);
    this.movementStates.delete(battleId);
  }

  /**
   * Update battle movement for all battalions (called every 100ms)
   */
  static async updateBattleMovement(battleId: string, battle: any, targetingResults: any[]): Promise<void> {
    if (!battle || targetingResults.length === 0) return;

    // Ensure movement states map exists for this battle
    if (!this.movementStates.has(battleId)) {
      this.movementStates.set(battleId, new Map());
    }
    
    const battleMovementStates = this.movementStates.get(battleId)!;
    let activeMovements = 0;
    
    // For each battalion with valid target, handle movement
    for (const targetResult of targetingResults) {
      const battalion = battle.battalions.find((b: IBattalion) => b.id === targetResult.battalionId);
      if (!battalion || targetResult.targetNode === -1) continue;

      // Check if movement already exists for this battalion
      let movementState = battleMovementStates.get(battalion.id);
      
      if (!movementState) {
        // Only start movement if screen dimensions are available
        try {
          const screenDimensions = BattalionPositionService.getBattleScreenDimensions(battleId);
          
          // Initiate new movement using actual client screen dimensions
          movementState = this.initiateMovement(
            battalion,
            targetResult.targetNode,
            screenDimensions.width,
            screenDimensions.height
          );
          battleMovementStates.set(battalion.id, movementState);
          console.log(`🚀 Started movement for ${battalion.owner} ${battalion.type} to node ${targetResult.targetNode}`);
        } catch (error) {
          // Skip movement until screen dimensions are set by client
          console.log(`⏳ Waiting for screen dimensions before starting movement for ${battalion.owner} ${battalion.type}`);
          continue;
        }
        
        // Movement initiated successfully
      } else if (movementState.movementStatus === 'moving') {
        // Check if movement is complete using updateMovementProgress()
        const updatedMovementState = this.updateMovementProgress(
          movementState,
          100, // 100ms deltaTime (unused in new time-based approach)
          battalion.stats.speed,
          0, // screenWidth (unused)
          0  // screenHeight (unused)
        );
        battleMovementStates.set(battalion.id, updatedMovementState);
        
        // Log movement status changes
        if (updatedMovementState.movementStatus === 'arrived') {
          console.log(`✅ ${battalion.owner} ${battalion.type} ARRIVED at node ${updatedMovementState.targetPosition.nodeIndex}`);
          
          // Start periodic attacking when battalion arrives at target
          const targetNode = battle.nodes.find((n: INode) => n.index === updatedMovementState.targetPosition.nodeIndex);
          if (targetNode && CombatService.canTargetNode(targetNode)) {
            AttackService.startAttacking(battalion, targetNode.index);
          }
        }
      }
      
      if (movementState?.movementStatus === 'moving') {
        activeMovements++;
      }
    }
    
    // Log active movements periodically
    if (activeMovements > 0 && Date.now() % 2000 < 100) { // Every ~2 seconds
      console.log(`📊 ACTIVE MOVEMENTS: ${activeMovements} battalions moving`);
    }
  }

  /**
   * Process all active attacks (moved from BattalionService)
   */
  static async processActiveAttacks(battle: any): Promise<void> {
    for (const [battalionId, attackState] of AttackService.getActiveAttacks()) {
      if (Date.now() - attackState.lastAttackTime >= attackState.attackInterval) {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
        const node = battle.nodes.find((n: INode) => n.index === attackState.targetNodeIndex);
        
        if (battalion && node && CombatService.canTargetNode(node)) {
          const captured = AttackService.processAttack(battalion, node);
          
          // Update last attack time
          attackState.lastAttackTime = Date.now();
          
          if (captured) {
            // Notify all attacking battalions to stop
            const attackers = AttackService.getBattalionsAttackingNode(node.index);
            attackers.forEach(id => AttackService.stopAttacking(id));
            console.log(`🏆 NODE CAPTURED: Node ${node.index} captured by ${node.owner}!`);
          }
          
          // Save the updated battle state
          await battle.save();
        }
      }
    }
  }

  /**
   * Initiate movement for a battalion to a target node using existing network validation
   */
  static initiateMovement(battalion: IBattalion, targetNode: number, screenWidth: number, screenHeight: number): MovementState {
    // Use existing TargetingService.getNetworkPath() for route validation
    const networkPath = TargetingService.getNetworkPath(battalion.position.nodeIndex, targetNode);
    
    // Use existing calculateNodePositions() for screen adaptation
    const nodePositions = calculateNodePositions(screenWidth, screenHeight);
    
    const startPosition = {
      x: nodePositions[battalion.position.nodeIndex].position.x,
      y: nodePositions[battalion.position.nodeIndex].position.y,
      nodeIndex: battalion.position.nodeIndex
    };
    
    // Calculate attack range position using existing battalion.stats.range
    const attackRangePosition = this.calculateAttackRangePosition(
      battalion, 
      targetNode, 
      nodePositions.map(n => n.position)
    );

    // Set target position to attack range position instead of target node center
    // This makes battalions stop when they reach attack range, not the target center
    const targetPosition = {
      x: attackRangePosition.x,
      y: attackRangePosition.y,
      nodeIndex: targetNode // Keep target node index for reference
    };

    // Determine if battalion is already within attack range
    const isWithinAttackRange = this.isWithinNetworkAttackRange(
      battalion,
      targetNode,
      nodePositions.map(n => n.position)
    );

    // Calculate estimated movement duration based on battalion speed
    // Use distance to attack range position, not target node center
    const movementDistance = this.calculateNetworkDistance(startPosition, attackRangePosition);
    const estimatedDuration = Math.round(MOVEMENT_CONFIG.BASE_MOVEMENT_TIME_MS / battalion.stats.speed);

    // Result: Guardian(9)=~2.2s, Phreak(7)=~2.9s, Breacher(5)=4.0s
    console.log(`🏃 ${battalion.owner} ${battalion.type} (speed=${battalion.stats.speed}) will move ${movementDistance.toFixed(1)}px to attack range for ${estimatedDuration}ms`);

    return {
      battalionId: battalion.id,
      startPosition,
      targetPosition,
      movementStatus: isWithinAttackRange ? 'stationary' : 'moving',
      startTime: Date.now(), // Movement begins now
      estimatedDuration,
      networkPath,
      attackRangePosition,
      isWithinAttackRange
    };
  }

  /**
   * Update movement progress and determine if movement is complete
   * NOTE: This is a time-based approach, not position-based
   */
  static updateMovementProgress(movementState: MovementState, deltaTime: number, speed: number, screenWidth: number, screenHeight: number): MovementState {
    if (movementState.movementStatus !== 'moving') {
      return movementState;
    }

    // Check if estimated duration has elapsed (battalion has reached attack range)
    const elapsedTime = Date.now() - movementState.startTime;
    
    // Add a small buffer (50ms) to prevent server/client timing conflicts
    // This ensures client interpolation completes smoothly before server marks as arrived
    const completionThreshold = movementState.estimatedDuration + 50;
    const isComplete = elapsedTime >= completionThreshold;

    if (isComplete) {
      console.log(`🎯 ${movementState.battalionId} REACHED ATTACK RANGE - stopped at attack position (elapsed: ${elapsedTime}ms, threshold: ${completionThreshold}ms)`);
    }

    return {
      ...movementState,
      movementStatus: isComplete ? 'arrived' : 'moving'
    };
  }

  /**
   * Calculate attack range position using existing bot stats and network constraints
   */
  static calculateAttackRangePosition(battalion: IBattalion, targetNode: number, nodePositions: Position[]): Position {
    const battalionPos = nodePositions[battalion.position.nodeIndex];
    const targetPos = nodePositions[targetNode];
    
    // Use same scaling as client visualization: 8 pixels per range unit
    const rangeInPixels = battalion.stats.range * 8;
    
    // Calculate network-constrained range (not circular)
    const lineDistance = this.calculateNetworkDistance(battalionPos, targetPos);
    
    if (lineDistance <= rangeInPixels) {
      // Target is within range from current position - don't move
      return battalionPos;
    }

    // Calculate position along network line at attack range distance from target
    const distanceFromTarget = rangeInPixels;
    const stopDistance = lineDistance - distanceFromTarget;
    const progress = stopDistance / lineDistance;
    
    return this.interpolateAlongNetworkLine(battalionPos, targetPos, progress);
  }

  /**
   * Check if battalion is within attack range using network distance
   */
  static isWithinNetworkAttackRange(battalion: IBattalion, targetNode: number, nodePositions: Position[]): boolean {
    const battalionPos = nodePositions[battalion.position.nodeIndex];
    const targetPos = nodePositions[targetNode];
    
    // Use same scaling as client visualization: 8 pixels per range unit
    const rangeInPixels = battalion.stats.range * 8;
    
    const networkDistance = this.calculateNetworkDistance(battalionPos, targetPos);
    return networkDistance <= rangeInPixels;
  }

  /**
   * Calculate distance along network line between two positions
   */
  private static calculateNetworkDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Interpolate position along network line using progress (0.0 to 1.0)
   */
  private static interpolateAlongNetworkLine(startPos: Position, targetPos: Position, progress: number): Position {
    return {
      x: startPos.x + (targetPos.x - startPos.x) * progress,
      y: startPos.y + (targetPos.y - startPos.y) * progress
    };
  }

  /**
   * Get all active movement states for a battle
   */
  static getActiveMovements(movementStates: Map<string, MovementState>): MovementState[] {
    return Array.from(movementStates.values()).filter(
      state => state.movementStatus === 'moving'
    );
  }

  /**
   * Get battalions that have arrived at their destinations
   */
  static getArrivedBattalions(movementStates: Map<string, MovementState>): MovementState[] {
    return Array.from(movementStates.values()).filter(
      state => state.movementStatus === 'arrived'
    );
  }

  /**
   * Get battalions within attack range of their targets
   */
  static getBattalionsInRange(movementStates: Map<string, MovementState>): MovementState[] {
    return Array.from(movementStates.values()).filter(
      state => state.isWithinAttackRange
    );
  }

  /**
   * Reset movement state to stationary
   */
  static resetToStationary(movementState: MovementState): MovementState {
    return {
      ...movementState,
      movementStatus: 'stationary'
    };
  }


} 