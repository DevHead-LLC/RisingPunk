import { calculateNodePositions } from '../services/NodeService';
import { TargetingService } from './TargetingService';
import { IBattalion } from '../types/battle';
import { MovementState } from '../types/battle';
import { MovementCalculationService } from './MovementCalculationService';
import { ScreenDimensionService } from './ScreenDimensionService';
import { PathfindingService } from './PathfindingService';
import { BattalionPositionService } from './BattalionPositionService';

export class MovementService {
  private static movementStates: Map<string, Map<string, MovementState>> = new Map();
  private static movementIntervals: Map<string, NodeJS.Timeout> = new Map();

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
    
    ScreenDimensionService.clearBattleScreenDimensions(battleId);
  }

  static async updateBattleMovement(battleId: string, battle: any, targetingResults: any[]): Promise<void> {
    if (!battle) return;

    if (!this.movementStates.has(battleId)) {
      this.movementStates.set(battleId, new Map());
    }
    
    const battleMovementStates = this.movementStates.get(battleId)!;
    let activeMovements = 0;
    let positionUpdated = false;
    
    for (const [battalionId, movementState] of battleMovementStates) {
      if (movementState.movementStatus === 'moving') {
        const updatedMovementState = this.updateMovementProgress(movementState, battleId, battle);
        battleMovementStates.set(battalionId, updatedMovementState);
        
        if (updatedMovementState.movementStatus === 'arrived') {
          const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
          if (battalion) {
            
            const finalPosition = BattalionPositionService.getFinalPosition(updatedMovementState);
            
            if (BattalionPositionService.updateBattalionPosition(battalion, finalPosition)) {
              positionUpdated = true;
            }
            
            if (updatedMovementState.movementType === 'interrupted_recovery' && updatedMovementState.needsRetargetingOnArrival) {
              
              const { AttackService } = require('./AttackService');
              AttackService.queueInterruptedBattalionRetargeting(battleId, battalionId);
              
              updatedMovementState.needsRetargetingOnArrival = false;
              updatedMovementState.movementType = 'retargeting';
              battleMovementStates.set(battalionId, updatedMovementState);
              continue;
            }
            
            const { AttackService } = require('./AttackService');
            const { CombatService } = require('./CombatService');
            const { BattalionService } = require('./BattalionService');
            
            if (!AttackService.isAttacking(battalion.id)) {
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
                  AttackService.startBattalionAttack(battalion, enemyBattalion.id);
                } else {
                  AttackService.queueMissingTargetRetargeting(battle.battleId, battalion.id);
                }
              } else {
                const targetNode = battle.nodes.find((n: any) => n.index === updatedMovementState.targetPosition.nodeIndex);
                if (targetNode && CombatService.canTargetNode(targetNode)) {
                  AttackService.startAttacking(battalion, targetNode.index);
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
        const battalion = battle.battalions.find((b: IBattalion) => b.id === targetResult.battalionId);
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
    
    if (positionUpdated) {
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
    
    if (movementType === 'initial') {
      movementState = this.initiateInitialMovement(battalion, targetNode, nodePositions, startPosition);
    } else if (movementType === 'retargeting') {
      movementState = this.initiateRetargetingMovement(battalion, targetNode, fullPath!, nodePositions, startPosition, battle);
    }
    
    if (movementState) {
      // Ensure proper movement type progression
      this.ensureMovementTypeProgression(movementState, movementType);
    }
    
    return movementState;
  }

  private static initiateInitialMovement(battalion: IBattalion, targetNode: number, nodePositions: any[], startPosition: any): MovementState | undefined {
    const networkPath = TargetingService.getNetworkPath(battalion.position.nodeIndex, targetNode);
    
    if (networkPath.length === 0) {
      return undefined;
    }
    
    const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
      battalion, targetNode, nodePositions.map(n => n.position)
    );
    
    const isReachable = PathfindingService.isNetworkReachable(battalion.position.nodeIndex, targetNode);
    if (!isReachable) {
      return undefined;
    }
    
    const duration = MovementCalculationService.calculateMovementDuration(battalion);
    
    return {
      battalionId: battalion.id,
      startPosition: startPosition,
      targetPosition: BattalionPositionService.createTargetPosition(attackRangePosition, targetNode),
      movementStatus: 'moving',
      startTime: Date.now(),
      estimatedDuration: duration,
      networkPath: networkPath,
      attackRangePosition: BattalionPositionService.createAttackRangePosition(attackRangePosition),
      isWithinAttackRange: false,
      movementType: 'initial',
      fullPath: networkPath,
      currentPathIndex: 0,
      finalTarget: targetNode,
      isInterruptible: false
    };
  }

  private static initiateRetargetingMovement(battalion: IBattalion, targetNode: number, fullPath: number[], nodePositions: any[], startPosition: any, battle?: any): MovementState | undefined {
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
      
      const distance = Math.sqrt(Math.pow(attackRangePosition.x - currentX, 2) + Math.pow(attackRangePosition.y - currentY, 2));
      const duration = Math.max(500, Math.min(1500, distance * 15));
      
      return {
        battalionId: battalion.id,
        startPosition: startPosition,
        targetPosition: BattalionPositionService.createTargetPositionFromAttackRange(attackRangePosition, targetNode),
        movementStatus: 'moving',
        startTime: Date.now(),
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
        nodePositions[battalion.position.nodeIndex].position, 
        attackRangePosition
      );
    } else {
      targetPosition = BattalionPositionService.createTargetPositionFromNode(nodePositions, nextNodeIndex);
      stepDistance = MovementCalculationService.calculateNetworkDistance(
        nodePositions[battalion.position.nodeIndex].position,
        nodePositions[nextNodeIndex].position
      );
    }
    
    const duration = MovementCalculationService.calculateMovementDuration(battalion);
    
    return {
      battalionId: battalion.id,
      startPosition: startPosition,
      targetPosition: targetPosition,
      movementStatus: 'moving',
      startTime: Date.now(),
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

  static updateMovementProgress(movementState: MovementState, battleId: string, battle?: any): MovementState {
    if (movementState.movementStatus !== 'moving') {
      return movementState;
    }

    const elapsedTime = Date.now() - movementState.startTime;
    const completionThreshold = movementState.estimatedDuration + 50;
    const isComplete = elapsedTime >= completionThreshold;
    
    if (isComplete) {
      
      if (movementState.movementType === 'retargeting' && movementState.fullPath && movementState.currentPathIndex !== undefined) {
        const nextPathIndex = movementState.currentPathIndex + 1;
        const hasMoreSteps = nextPathIndex < movementState.fullPath.length - 1;
        
        if (hasMoreSteps) {
          const nextNodeIndex = movementState.fullPath[nextPathIndex + 1];
          const isLastStep = nextPathIndex + 1 === movementState.fullPath.length - 1;
                    
          let nodePositions;
          try {
            const { ScreenDimensionService } = require('./ScreenDimensionService');
            const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
            
            if (!screenDimensions || !screenDimensions.width || !screenDimensions.height) {
              const fallbackDimensions = { width: 800, height: 600 };
              nodePositions = calculateNodePositions(fallbackDimensions.width, fallbackDimensions.height);
            } else {
              nodePositions = calculateNodePositions(screenDimensions.width, screenDimensions.height);
            }
          } catch (error) {
            const fallbackDimensions = { width: 800, height: 600 };
            nodePositions = calculateNodePositions(fallbackDimensions.width, fallbackDimensions.height);
          }
          
          movementState.currentPathIndex = nextPathIndex;
          movementState.movementStatus = 'moving';
          movementState.startTime = Date.now();
          movementState.startPosition = movementState.targetPosition;
          
          if (isLastStep) {
            const actualBattalion = battle?.battalions?.find((b: any) => b.id === movementState.battalionId);
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
          
          const battalionForSpeed = battle?.battalions?.find((b: any) => b.id === movementState.battalionId);
          if (!battalionForSpeed) {
            movementState.estimatedDuration = 2000;
          } else {
            const duration = MovementCalculationService.calculateMovementDuration(battalionForSpeed);
            movementState.estimatedDuration = duration;
            movementState.startTime = Date.now();
            
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

  static interruptRetargetingMovement(battalionId: string, battleId: string): boolean {
    const battleMovementStates = this.movementStates.get(battleId);
    if (!battleMovementStates) return false;

    const movementState = battleMovementStates.get(battalionId);
    if (!movementState || !movementState.isInterruptible) {
      return false;
    }

    const { MovementCalculationService } = require('./MovementCalculationService');
    const currentPosition = MovementCalculationService.calculateCurrentMovementPosition(movementState);
        
    movementState.targetPosition = currentPosition;
    movementState.movementStatus = 'arrived';
    movementState.wasInterrupted = true;
    movementState.interruptionPosition = currentPosition;
        
    battleMovementStates.set(battalionId, movementState);

    return true;
  }

  static initiateMovementToNearestNode(battalion: any, interruptionPosition: any, battleId: string): void {    
    const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
    const nodePositions = calculateNodePositions(screenDimensions.width, screenDimensions.height);
    const targetNodePosition = nodePositions[interruptionPosition.nodeIndex];
    
    const { MovementCalculationService } = require('./MovementCalculationService');
    const actualDistance = MovementCalculationService.calculateNetworkDistance(
      { x: interruptionPosition.x, y: interruptionPosition.y },
      targetNodePosition.position
    );
    
    const fullMovementDuration = MovementCalculationService.calculateMovementDuration(battalion);
    const averageNodeDistance = 300;
    const proportionalDuration = Math.max(
      500,
      Math.round((actualDistance / averageNodeDistance) * fullMovementDuration)
    );
    
    const movementState = {
      battalionId: battalion.id,
      startPosition: BattalionPositionService.createStartPositionFromInterruption(interruptionPosition, battalion.position.nodeIndex),
      targetPosition: BattalionPositionService.createTargetPositionFromNodePosition(targetNodePosition, interruptionPosition.nodeIndex),
      movementStatus: 'moving',
      startTime: Date.now(),
      estimatedDuration: proportionalDuration,
      networkPath: [battalion.position.nodeIndex, interruptionPosition.nodeIndex],
      attackRangePosition: { x: targetNodePosition.position.x, y: targetNodePosition.position.y },
      isWithinAttackRange: false,
      movementType: 'interrupted_recovery',
      currentPathIndex: 0,
      finalTarget: interruptionPosition.nodeIndex,
      isInterruptible: false,
      needsRetargetingOnArrival: true,
      originalInterruptionPosition: interruptionPosition
    };
    
    const battleMovementStates = this.movementStates.get(battleId) || new Map();
    battleMovementStates.set(battalion.id, movementState);
    this.movementStates.set(battleId, battleMovementStates);    
  }

  static getArrivedBattalions(movementStates: Map<string, MovementState>): MovementState[] {
    const arrivedStates = Array.from(movementStates.values()).filter(
      state => state.movementStatus === 'arrived'
    );
    
    // Log invalid positions for debugging but don't filter them out
    // This maintains existing behavior while providing visibility into data issues
    arrivedStates.forEach(state => {
      if (!BattalionPositionService.hasValidPositionInMovementState(state)) {
        console.warn(`MovementService: Arrived battalion ${state.battalionId} has invalid position:`, state.targetPosition);
      }
    });
    
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
    const { AttackService } = require('./AttackService');
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