import { calculateNodePositions } from '../services/NodeService';
import { TargetingService } from './TargetingService';
import { IBattalion } from '../types/battle';
import { MovementState } from '../types/battle';
import { MovementCalculationService } from './MovementCalculationService';
import { ScreenDimensionService } from './ScreenDimensionService';
import { PathfindingService } from './PathfindingService';
import { BattalionPositionService } from './BattalionPositionService';
import { isHeadlessWorkingBattleActive, movementClockStartMs } from './HeadlessBattleRunner';

type HeadlessSegmentRow = { anchorStartTime: number; progressMs: number };

export class MovementService {
  private static movementStates: Map<string, Map<string, MovementState>> = new Map();
  private static movementIntervals: Map<string, NodeJS.Timeout> = new Map();
  /** Per-battle per-battalion virtual elapsed for headless timer (resets when `movementState.startTime` changes). */
  private static headlessSegmentProgress: Map<string, Map<string, HeadlessSegmentRow>> = new Map();
  
  // Cache for frequently used services
  private static serviceCache: Map<string, any> = new Map();
  
  // Cache for node positions per battle
  private static nodePositionCache: Map<string, { positions: any[], timestamp: number }> = new Map();
  private static NODE_CACHE_TTL = 5000; // 5 seconds
  
  // Cache for battalion lookups per battle
  private static battalionIndexCache: Map<string, { battalionMap: Map<string, any>, timestamp: number }> = new Map();
  
  // Cache for frequently used math calculations
  private static mathCache: Map<string, number> = new Map();
  private static MATH_CACHE_SIZE = 1000; // Limit cache size

  private static getNodePositions(battleId: string): any[] {
    const now = Date.now();
    const cached = this.nodePositionCache.get(battleId);
    
    if (cached && (now - cached.timestamp) < this.NODE_CACHE_TTL) {
      return cached.positions;
    }
    
    try {
      const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
      const positions = calculateNodePositions(screenDimensions.width, screenDimensions.height);
      
      this.nodePositionCache.set(battleId, { positions, timestamp: now });
      return positions;
    } catch (error) {
      console.error(`MovementService: Failed to get screen dimensions for battle ${battleId}:`, error);
      throw new Error(`Screen dimensions not available for battle ${battleId}. Battle may not be properly initialized.`);
    }
  }

  private static findBattalionById(battalions: any[], battalionId: string): any {
    return battalions.find((b: any) => b.id === battalionId);
  }

  private static getCachedService(serviceName: string): any {
    if (!this.serviceCache.has(serviceName)) {
      try {
        this.serviceCache.set(serviceName, require(`./${serviceName}`));
      } catch (error) {
        console.error(`MovementService: Failed to load service ${serviceName}:`, error);
        throw new Error(`Service ${serviceName} not found or failed to load`);
      }
    }
    return this.serviceCache.get(serviceName);
  }

  private static clearNodePositionCache(battleId?: string): void {
    if (battleId) {
      this.nodePositionCache.delete(battleId);
    } else {
      this.nodePositionCache.clear();
    }
  }

  private static clearBattalionIndexCache(battleId?: string): void {
    if (battleId) {
      this.battalionIndexCache.delete(battleId);
    } else {
      this.battalionIndexCache.clear();
    }
  }

  private static getCachedMath(key: string, calculation: () => number): number {
    if (this.mathCache.has(key)) {
      return this.mathCache.get(key)!;
    }
    
    const result = calculation();
    
    // Limit cache size
    if (this.mathCache.size >= this.MATH_CACHE_SIZE) {
      const firstKey = this.mathCache.keys().next().value;
      if (firstKey) {
        this.mathCache.delete(firstKey);
      }
    }
    
    this.mathCache.set(key, result);
    return result;
  }

  private static createBaseMovementState(
    battalionId: string,
    startPosition: any,
    targetPosition: any,
    movementType: 'initial' | 'retargeting' | 'interrupted_recovery',
    networkPath: number[],
    estimatedDuration: number,
    finalTarget: number,
    isInterruptible: boolean = false,
    clockBattleId?: string
  ): MovementState {
    return {
      battalionId,
      startPosition,
      targetPosition,
      movementStatus: 'moving',
      startTime: movementClockStartMs(clockBattleId),
      estimatedDuration,
      networkPath,
      attackRangePosition: { x: targetPosition.x, y: targetPosition.y },
      isWithinAttackRange: false,
      movementType,
      fullPath: networkPath,
      currentPathIndex: 0,
      finalTarget,
      isInterruptible
    };
  }

  private static createMovementState(
    battalion: IBattalion,
    startPosition: any,
    targetPosition: any,
    movementType: 'initial' | 'retargeting' | 'interrupted_recovery',
    networkPath: number[],
    estimatedDuration: number,
    finalTarget: number,
    isInterruptible: boolean = false,
    additionalProps?: Partial<MovementState>,
    clockBattleId?: string
  ): MovementState {
    const baseState = this.createBaseMovementState(
      battalion.id,
      startPosition,
      targetPosition,
      movementType,
      networkPath,
      estimatedDuration,
      finalTarget,
      isInterruptible,
      clockBattleId
    );
    
    return { ...baseState, ...additionalProps };
  }

  private static calculateSameNodeAttackRangePosition(battalion: IBattalion, startPosition: any, nodePosition: any): { x: number, y: number } {
    const baseAttackRange = battalion.stats.range || 50;
    const sameNodeAttackRange = Math.min(baseAttackRange, 15);
    
    let attackRangeX;
    if (battalion.owner === 'user') {
      attackRangeX = nodePosition.x - sameNodeAttackRange;
    } else {
      attackRangeX = nodePosition.x + sameNodeAttackRange;
    }
    
    const attackRangeY = nodePosition.y;
    
    const nodeRadius = 25;
    const clampedX = Math.max(nodePosition.x - nodeRadius, Math.min(nodePosition.x + nodeRadius, attackRangeX));
    const clampedY = Math.max(nodePosition.y - nodeRadius, Math.min(nodePosition.y + nodeRadius, attackRangeY));
    
    return { x: clampedX, y: clampedY };
  }

  static getMovementStates(battleId: string): Map<string, MovementState> {
    return this.movementStates.get(battleId) || new Map();
  }

  static startMovementUpdates(battleId: string, updateCallback: (battleId: string) => Promise<void>): void {
    if (this.movementIntervals.has(battleId)) return;

    const movementInterval = setInterval(async () => {
      await updateCallback(battleId);
    }, 100);

    this.movementIntervals.set(battleId, movementInterval);
  }

  static stopMovementUpdates(battleId: string): void {
    const interval = this.movementIntervals.get(battleId);
    if (interval) {
      clearInterval(interval);
      this.movementIntervals.delete(battleId);
    }

    this.headlessSegmentProgress.delete(battleId);

    // Clear cached data for this battle
    this.clearNodePositionCache(battleId);
    this.clearBattalionIndexCache(battleId);
  }

  static resetHeadlessMovementProgress(battleId: string): void {
    this.headlessSegmentProgress.delete(battleId);
  }

  static async updateBattleMovement(
    battleId: string,
    battle: any,
    targetingResults: any[],
    headlessMicroStepMs?: number
  ): Promise<void> {
    if (!battle) return;

    if (!this.movementStates.has(battleId)) {
      this.movementStates.set(battleId, new Map());
    }

    const battleMovementStates = this.movementStates.get(battleId)!;
    const headlessMap =
      headlessMicroStepMs !== undefined && Number.isFinite(headlessMicroStepMs) && headlessMicroStepMs > 0
        ? (() => {
            let m = this.headlessSegmentProgress.get(battleId);
            if (!m) {
              m = new Map();
              this.headlessSegmentProgress.set(battleId, m);
            }
            return m;
          })()
        : undefined;

    let activeMovements = 0;
    let positionUpdated = false;

    for (const [battalionId, movementState] of battleMovementStates) {
      if (movementState.movementStatus === 'moving') {
        let progressOpts: { movementElapsedMs: number } | undefined;
        if (headlessMap) {
          let row = headlessMap.get(battalionId);
          if (!row || row.anchorStartTime !== movementState.startTime) {
            row = { anchorStartTime: movementState.startTime, progressMs: 0 };
          }
          row.progressMs += headlessMicroStepMs!;
          headlessMap.set(battalionId, row);
          progressOpts = { movementElapsedMs: row.progressMs };
        }
        const updatedMovementState = this.updateMovementProgress(
          movementState,
          battleId,
          battle,
          progressOpts
        );
        battleMovementStates.set(battalionId, updatedMovementState);
        
        if (updatedMovementState.movementStatus === 'moving' && updatedMovementState.wasPositionUpdated) {
          positionUpdated = true;
          updatedMovementState.wasPositionUpdated = false;
          battleMovementStates.set(battalionId, updatedMovementState);
        }
        
        if (updatedMovementState.movementStatus === 'arrived') {
          const battalion = this.findBattalionById(battle.battalions, battalionId);
          if (battalion) {
            
            const finalPosition = BattalionPositionService.getFinalPosition(updatedMovementState);
            
            if (BattalionPositionService.updateBattalionPosition(battalion, finalPosition)) {
              positionUpdated = true;
            }
            
            if (updatedMovementState.movementType === 'interrupted_recovery' && updatedMovementState.needsRetargetingOnArrival) {
              
              const { AttackService } = this.getCachedService('AttackService');
              AttackService.queueInterruptedBattalionRetargeting(battleId, battalionId);
              
              updatedMovementState.needsRetargetingOnArrival = false;
              updatedMovementState.movementType = 'retargeting';
              battleMovementStates.set(battalionId, updatedMovementState);
              continue;
            }
            
            const { AttackService } = this.getCachedService('AttackService');
            const { CombatService } = this.getCachedService('CombatService');
            const { BattalionService } = this.getCachedService('BattalionService');
            
            if (!AttackService.isAttacking(battleId, battalion.id)) {
              const targetingResult = BattalionService.getTargetingResultForBattalion(battalion.id, battleId);
              
              if (targetingResult && targetingResult.targetType === 'enemy_battalion') {
                let enemyBattalion: IBattalion | undefined;
                
                if (targetingResult.targetBattalionId) {
                  enemyBattalion = battle.battalions.find((b: IBattalion) => 
                    b.id === targetingResult.targetBattalionId && !b.isDestroyed
                  );
                } else {
                  enemyBattalion = battle.battalions.find((b: IBattalion) => 
                    b.owner !== battalion.owner && 
                    b.position.nodeIndex === updatedMovementState.targetPosition.nodeIndex && !b.isDestroyed
                  );
                }
                
                if (enemyBattalion) {
                  AttackService.startAttack(battleId, battalion, 'battalion', enemyBattalion.id);
                } else {
                  AttackService.queueMissingTargetRetargeting(battle.battleId, battalion.id);
                }
              } else {
                const targetNode = battle.nodes.find((n: any) => n.index === updatedMovementState.targetPosition.nodeIndex);
                if (targetNode && CombatService.canTargetNode(targetNode)) {
                  AttackService.startAttack(battleId, battalion, 'node', targetNode.index);
                }
              }
            }
          }
        }
        
        activeMovements++;
      }
    }
    
    if (targetingResults.length > 0) {
      for (const targetResult of targetingResults) {
        const battalion = this.findBattalionById(battle.battalions, targetResult.battalionId);
        if (!battalion || targetResult.targetNode === -1) continue;

        let movementState = battleMovementStates.get(battalion.id);
        
        if (!movementState) {
          const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
          
          movementState = this.initiateMovement(
            battalion,
            targetResult.targetNode,
            screenDimensions.width,
            screenDimensions.height,
            'initial',
            undefined,
            undefined,
            'INITIAL_TARGETING'
          );
          
          if (movementState) {
            battleMovementStates.set(battalion.id, movementState);
            activeMovements++;
          }
        }
      }
    }
    
    if (positionUpdated && !isHeadlessWorkingBattleActive(battleId)) {
      await battle.save();
    }
  }

  static initiateMovement(
    battalion: IBattalion, 
    targetNode: number, 
    screenWidth: number, 
    screenHeight: number,
    movementType: 'initial' | 'retargeting' = 'initial',
    fullPath?: number[],
    battle?: any,
    source: string = 'UNKNOWN'
  ): MovementState | undefined {
    const nodePositions = calculateNodePositions(screenWidth, screenHeight);
    
    if (!BattalionPositionService.canStartMovement(battalion, nodePositions)) {
      return undefined;
    }
    
    const startPosition = BattalionPositionService.createStartPosition(battalion, nodePositions);
    
    let movementState: MovementState | undefined;
    
    const clockBattleId = battle?.battleId != null ? String(battle.battleId) : undefined;

    if (movementType === 'initial') {
      movementState = this.initiateInitialMovement(battalion, targetNode, nodePositions, startPosition, clockBattleId);
    } else if (movementType === 'retargeting') {
      movementState = this.initiateRetargetingMovement(
        battalion,
        targetNode,
        fullPath!,
        nodePositions,
        startPosition,
        battle,
        clockBattleId
      );
    }
    
    if (movementState) {
      // Ensure proper movement type progression
      this.ensureMovementTypeProgression(movementState, movementType);
    }
    
    return movementState;
  }

  private static initiateInitialMovement(
    battalion: IBattalion,
    targetNode: number,
    nodePositions: any[],
    startPosition: any,
    clockBattleId?: string
  ): MovementState | undefined {
    const networkPath = PathfindingService.findNetworkPath(battalion.position.nodeIndex, targetNode);
    if (!networkPath || networkPath.length === 0) {
      return undefined;
    }
    
    const isReachable = PathfindingService.isNetworkReachable(battalion.position.nodeIndex, targetNode);
    if (!isReachable) {
      return undefined;
    }
    
    const duration = MovementCalculationService.calculateMovementDuration(battalion);
    
    // Calculate attack range position
    const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
      battalion, targetNode, nodePositions.map(n => n.position)
    );
    
    return this.createBaseMovementState(
      battalion.id,
      startPosition,
      BattalionPositionService.createTargetPosition(attackRangePosition, targetNode),
      'initial',
      networkPath,
      duration,
      targetNode,
      false,
      clockBattleId
    );
  }

  private static initiateRetargetingMovement(
    battalion: IBattalion,
    targetNode: number,
    fullPath: number[],
    nodePositions: any[],
    startPosition: any,
    battle?: any,
    clockBattleId?: string
  ): MovementState | undefined {
    if (!fullPath || fullPath.length === 0) {
      return undefined;
    }
    
    if (fullPath.length === 1) {
      if (!battle || !battle.battalions) {
        return undefined;
      }
      
      const targetBattalion = battle.battalions.find((b: any) => 
        b.owner !== battalion.owner && b.position.nodeIndex === targetNode
      );
      
      if (!targetBattalion) {
        return undefined;
      }
      
      const baseAttackRange = battalion.stats.range || 50;
      const sameNodeAttackRange = Math.min(baseAttackRange, 15);
      const currentX = startPosition.x;
      const currentY = startPosition.y;
      
      let attackRangeX, attackRangeY;
      
      const nodePosition = nodePositions[targetNode].position;
      const nodeX = nodePosition.x;
      
      if (battalion.owner === 'user') {
        attackRangeX = nodeX - sameNodeAttackRange;
      } else {
        attackRangeX = nodeX + sameNodeAttackRange;
      }
      
      attackRangeY = nodePosition.y;
      
      const nodeRadius = 25;
      const clampedX = Math.max(nodePosition.x - nodeRadius, Math.min(nodePosition.x + nodeRadius, attackRangeX));
      const clampedY = Math.max(nodePosition.y - nodeRadius, Math.min(nodePosition.y + nodeRadius, attackRangeY));
      
      const attackRangePosition = { x: clampedX, y: clampedY };
      
      const distanceKey = `distance_${attackRangePosition.x}_${attackRangePosition.y}_${currentX}_${currentY}`;
      const distance = this.getCachedMath(distanceKey, () => 
        Math.sqrt(Math.pow(attackRangePosition.x - currentX, 2) + Math.pow(attackRangePosition.y - currentY, 2))
      );
      const duration = Math.max(500, Math.min(1500, distance * 15));
      
      return {
        battalionId: battalion.id,
        startPosition: startPosition,
        targetPosition: BattalionPositionService.createTargetPositionFromAttackRange(attackRangePosition, targetNode),
        movementStatus: 'moving',
        startTime: movementClockStartMs(clockBattleId),
        estimatedDuration: duration,
        networkPath: fullPath,
        attackRangePosition: { x: attackRangePosition.x, y: attackRangePosition.y },
        isWithinAttackRange: false,
        movementType: 'retargeting',
        fullPath: fullPath,
        currentPathIndex: 0,
        finalTarget: targetNode,
        isInterruptible: true
      };
    }
    
    if (fullPath.length < 2) {
      return undefined;
    }
    
    const nextNodeIndex = fullPath[1];
    const isLastStep = fullPath.length === 2;
    
    let targetPosition;
    let stepDistance;
    
    if (isLastStep) {
      const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
        battalion, nextNodeIndex, nodePositions.map(n => n.position)
      );
      targetPosition = BattalionPositionService.createTargetPositionFromAttackRange(attackRangePosition, nextNodeIndex);
      stepDistance = MovementCalculationService.calculateNetworkDistance(
        { x: battalion.position.x, y: battalion.position.y }, 
        attackRangePosition
      );
    } else {
      targetPosition = BattalionPositionService.createTargetPositionFromNode(nodePositions, nextNodeIndex);
      stepDistance = MovementCalculationService.calculateNetworkDistance(
        { x: battalion.position.x, y: battalion.position.y },
        nodePositions[nextNodeIndex].position
      );
    }
    
    const duration = MovementCalculationService.calculateMovementDuration(battalion);
    
    return {
      battalionId: battalion.id,
      startPosition: startPosition,
      targetPosition: targetPosition,
      movementStatus: 'moving',
      startTime: movementClockStartMs(clockBattleId),
      estimatedDuration: duration,
      networkPath: [battalion.position.nodeIndex, nextNodeIndex],
      attackRangePosition: { x: targetPosition.x, y: targetPosition.y },
      isWithinAttackRange: false,
      movementType: 'retargeting',
      fullPath: fullPath,
      currentPathIndex: 0,
      finalTarget: fullPath[fullPath.length - 1],
      isInterruptible: true
    };
  }

  static updateMovementProgress(
    movementState: MovementState,
    battleId: string,
    battle?: any,
    opts?: { movementElapsedMs?: number }
  ): MovementState {
    if (movementState.movementStatus !== 'moving') {
      return movementState;
    }

    const elapsedTime =
      opts?.movementElapsedMs !== undefined
        ? opts.movementElapsedMs
        : Date.now() - movementState.startTime;
    const completionThreshold = movementState.estimatedDuration + 50;
    const isComplete = elapsedTime >= completionThreshold;
    
    if (!isComplete) {
      const { MovementCalculationService } = this.getCachedService('MovementCalculationService');
      const currentPosition = MovementCalculationService.calculateCurrentMovementPositionFromElapsed(
        movementState,
        elapsedTime
      );
      
      const battalion = this.findBattalionById(battle?.battalions || [], movementState.battalionId);
      if (battalion) {
        if (BattalionPositionService.updateBattalionPosition(battalion, currentPosition)) {
          movementState.wasPositionUpdated = true;
        }
      }
    }
    
    if (isComplete) {
      if (movementState.movementType === 'retargeting' && movementState.fullPath && movementState.currentPathIndex !== undefined) {
        const nextPathIndex = movementState.currentPathIndex + 1;
        const hasMoreSteps = nextPathIndex < movementState.fullPath.length - 1;
        
        if (hasMoreSteps) {
          const nextNodeIndex = movementState.fullPath[nextPathIndex + 1];
          const isLastStep = nextPathIndex + 1 === movementState.fullPath.length - 1;
                    
          const nodePositions = this.getNodePositions(battleId);
          
          movementState.currentPathIndex = nextPathIndex;
          movementState.movementStatus = 'moving';
          movementState.startTime = movementClockStartMs(battleId);
          movementState.startPosition = movementState.targetPosition;
          
          if (isLastStep) {
            const actualBattalion = this.findBattalionById(battle?.battalions || [], movementState.battalionId);
            if (!actualBattalion) {
              movementState.targetPosition = BattalionPositionService.createTargetPositionFromNode(nodePositions, nextNodeIndex);
            } else {
              const currentNodeIndex = movementState.fullPath![movementState.currentPathIndex!];
              
              if (!actualBattalion.stats) {
                movementState.targetPosition = BattalionPositionService.createTargetPositionFromNode(nodePositions, nextNodeIndex);
              } else {
                const battalionAtCurrentPosition = BattalionPositionService.createBattalionAtPosition(actualBattalion, currentNodeIndex);
                
                const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
                  battalionAtCurrentPosition,
                  nextNodeIndex,
                  nodePositions.map(n => n.position)
                );
                movementState.targetPosition = BattalionPositionService.createTargetPositionFromAttackRangeForMovement(attackRangePosition, nextNodeIndex);
              }
            }
          } else {
            movementState.targetPosition = BattalionPositionService.createTargetPositionFromNode(nodePositions, nextNodeIndex);
          }
          
          const stepDistance = MovementCalculationService.calculateNetworkDistance(
            movementState.startPosition,
            movementState.targetPosition
          );
          
          const battalionForSpeed = this.findBattalionById(battle?.battalions || [], movementState.battalionId);
          if (!battalionForSpeed) {
            movementState.estimatedDuration = 2000;
          } else {
            const duration = MovementCalculationService.calculateMovementDuration(battalionForSpeed);
            movementState.estimatedDuration = duration;
            movementState.startTime = movementClockStartMs(battleId);
            
            return {
              ...movementState,
              movementStatus: 'moving'
            };
          }
        } else {
          movementState.isWithinAttackRange = true;
        }
      }
    }

    return {
      ...movementState,
      movementStatus: isComplete ? 'arrived' : 'moving'
    };
  }

  static interruptRetargetingMovement(battalionId: string, battleId: string, battle?: any): boolean {
    const battleMovementStates = this.movementStates.get(battleId);
    if (!battleMovementStates) return false;

    const movementState = battleMovementStates.get(battalionId);
    if (!movementState || !movementState.isInterruptible) {
      return false;
    }

    const { MovementCalculationService } = this.getCachedService('MovementCalculationService');
    const currentPosition = MovementCalculationService.calculateCurrentMovementPosition(movementState);
        
    movementState.targetPosition = currentPosition;
    movementState.movementStatus = 'arrived';
    movementState.wasInterrupted = true;
    movementState.interruptionPosition = currentPosition;
    
    const battalion = this.findBattalionById(battle?.battalions || [], battalionId);
    if (battalion) {
      BattalionPositionService.updateBattalionPosition(battalion, currentPosition);
    }
        
    battleMovementStates.set(battalionId, movementState);

    return true;
  }



  static getArrivedBattalions(movementStates: Map<string, MovementState>): MovementState[] {
    // Pre-allocate array size for better performance
    const arrivedStates: MovementState[] = [];
    
    // Use for...of instead of Array.from().filter() for better performance
    for (const state of movementStates.values()) {
      if (state.movementStatus === 'arrived') {
        arrivedStates.push(state);
      }
    }
    
    // Log invalid positions for debugging but don't filter them out
    // This maintains existing behavior while providing visibility into data issues
    for (const state of arrivedStates) {
      if (!BattalionPositionService.hasValidPositionInMovementState(state)) {
        console.warn(`MovementService: Arrived battalion ${state.battalionId} has invalid position:`, state.targetPosition);
      }
    }
    
    return arrivedStates;
  }

  // ============================================================================
  // CENTRALIZED MOVEMENT STATE COORDINATION
  // ============================================================================

  static async coordinateMovementState(battleId: string, battle: any, targetingResults: any[]): Promise<void> {
    if (!battle) return;

    if (battle.phase === 'COMPLETE') {
      return;
    }

    // Update movement progress and handle arrivals
    await this.updateBattleMovement(battleId, battle, targetingResults);
    
    // Process attacks after movement updates
    const { AttackService } = this.getCachedService('AttackService');
    await AttackService.processActiveAttacks(battle);
  }

  static ensureMovementTypeProgression(movementState: MovementState, newType: 'initial' | 'retargeting' | 'interrupted_recovery'): void {
    // Ensure proper progression: initial → retargeting → interrupted_recovery → retargeting
    const validTransitions = {
      'initial': ['retargeting', 'interrupted_recovery'],
      'retargeting': ['interrupted_recovery', 'retargeting'],
      'interrupted_recovery': ['retargeting']
    };

    const currentType = movementState.movementType || 'initial';
    const allowedTransitions = validTransitions[currentType as keyof typeof validTransitions] || [];

    if (allowedTransitions.includes(newType)) {
      movementState.movementType = newType;
    } 
  }
} 