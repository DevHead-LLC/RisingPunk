import { calculateNodePositions } from '../services/NodeService';
import { TargetingService } from './TargetingService';
import { IBattalion, INode } from '../types/battle';

// Movement configuration constants (single source of truth for movement timing)
const MOVEMENT_CONFIG = {
  BASE_MOVEMENT_TIME_MS: 20000,  // Base movement time in milliseconds (20 seconds)
} as const;

// Import shared MovementState interface from client types
import { MovementState } from '../../../mobile/src/types/battleTypes';

interface Position {
  x: number;
  y: number;
}

export class MovementService {
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

  /**
   * Update battalion position from movement state (for server-side validation)
   */
  static updateBattalionPosition(battalion: IBattalion, movementState: MovementState): IBattalion {
    // For arrived battalions, update to target position
    // For moving battalions, client handles smooth interpolation
    const finalPosition = movementState.movementStatus === 'arrived' 
      ? movementState.targetPosition
      : movementState.startPosition;

    return {
      ...battalion,
      position: {
        x: finalPosition.x,
        y: finalPosition.y,
        nodeIndex: finalPosition.nodeIndex
      }
    };
  }
} 