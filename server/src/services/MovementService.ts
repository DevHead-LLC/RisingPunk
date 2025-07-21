import { BATTLE_CONFIG } from '../config/battleConfig';
import { TargetingService } from './TargetingService';
import { IBattalion, INode } from '../types/battle';

// Import shared MovementState interface from client types
export interface MovementState {
  battalionId: string;
  startPosition: { x: number; y: number; nodeIndex: number };
  targetPosition: { x: number; y: number; nodeIndex: number };
  movementStatus: 'stationary' | 'moving' | 'arrived';
  startTime: number; // Timestamp when movement began (Date.now())
  estimatedDuration: number; // Total movement duration in milliseconds
  networkPath: number[]; // [startNode, targetNode] from TargetingService
  attackRangePosition?: { x: number; y: number };
  isWithinAttackRange: boolean;
}

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
    
    // Use existing BATTLE_CONFIG.calculateNodePositions() for screen adaptation
    const nodePositions = BATTLE_CONFIG.calculateNodePositions(screenWidth, screenHeight);
    
    const startPosition = {
      x: nodePositions[battalion.position.nodeIndex].position.x,
      y: nodePositions[battalion.position.nodeIndex].position.y,
      nodeIndex: battalion.position.nodeIndex
    };
    
    const targetPosition = {
      x: nodePositions[targetNode].position.x,
      y: nodePositions[targetNode].position.y,
      nodeIndex: targetNode
    };

    // Calculate attack range position using existing battalion.stats.range
    const attackRangePosition = this.calculateAttackRangePosition(
      battalion, 
      targetNode, 
      nodePositions.map(n => n.position)
    );

    // Determine if battalion is already within attack range
    const isWithinAttackRange = this.isWithinNetworkAttackRange(
      battalion,
      targetNode,
      nodePositions.map(n => n.position)
    );

    // Calculate estimated movement duration based on battalion speed
    // Base time scaled by relative speed - fastest unit (Guardian, speed=9) reaches in ~2.2 seconds
    const speedRatio = BATTLE_CONFIG.MOVEMENT_SPEED_REFERENCE / battalion.stats.speed; // Higher speed = lower ratio = faster movement
    const estimatedDuration = Math.round(BATTLE_CONFIG.MOVEMENT_BASE_TIME_MS * speedRatio);

    // Result: Guardian(9)=~2.2s, Phreak(7)=~2.9s, Breacher(5)=4.0s
    console.log(`🏃 ${battalion.owner} ${battalion.type} (speed=${battalion.stats.speed}) will move for ${estimatedDuration}ms`);

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
   * Check if movement is complete based on elapsed time
   */
  static updateMovementProgress(movementState: MovementState, deltaTime: number, battalionSpeed: number, screenWidth: number, screenHeight: number): MovementState {
    if (movementState.movementStatus !== 'moving') {
      return movementState;
    }

    // Check if estimated duration has elapsed
    const elapsedTime = Date.now() - movementState.startTime;
    const isComplete = elapsedTime >= movementState.estimatedDuration;

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
    
    // Use existing battalion.stats.range from BATTLE_CONFIG.BOT_STATS
    const range = battalion.stats.range;
    
    // Calculate network-constrained range (not circular)
    // Use existing BATTLE_CONFIG.calculateLineProperties() for range direction
    const lineDistance = this.calculateNetworkDistance(battalionPos, targetPos);
    
    if (lineDistance <= range) {
      // Target is within range from current position
      return battalionPos;
    }

    // Calculate position along network line at attack range distance
    const rangeProgress = range / lineDistance;
    return this.interpolateAlongNetworkLine(battalionPos, targetPos, rangeProgress);
  }

  /**
   * Check if battalion is within attack range using network distance
   */
  static isWithinNetworkAttackRange(battalion: IBattalion, targetNode: number, nodePositions: Position[]): boolean {
    const battalionPos = nodePositions[battalion.position.nodeIndex];
    const targetPos = nodePositions[targetNode];
    
    const networkDistance = this.calculateNetworkDistance(battalionPos, targetPos);
    return networkDistance <= battalion.stats.range;
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