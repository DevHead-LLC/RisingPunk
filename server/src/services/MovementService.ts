import { calculateNodePositions } from '../services/NodeService';
import { TargetingService } from './TargetingService';
import { IBattalion } from '../types/battle';
import { MovementState } from '../types/battle';
import { NodePosition } from '../../../mobile/src/types/battleTypes';
import { MovementCalculationService } from './MovementCalculationService';
import { ScreenDimensionService } from './ScreenDimensionService';
import { PathfindingService } from './PathfindingService';
import { BattalionTargetingResult } from '../types/battle';

export class MovementService {
  private static movementStates: Map<string, Map<string, MovementState>> = new Map();
  private static movementIntervals: Map<string, NodeJS.Timeout> = new Map();

  static getMovementStates(battleId: string): Map<string, MovementState> {
    return this.movementStates.get(battleId) || new Map();
  }

  static startMovementUpdates(battleId: string, updateCallback: (battleId: string) => Promise<void>): void {
    if (this.movementIntervals.has(battleId)) return;

    console.log(`🏃 STARTING MOVEMENT UPDATES for battle ${battleId} (100ms intervals)`);

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
      console.log(`⏹️ STOPPED MOVEMENT UPDATES for battle ${battleId}`);
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
            console.log(`✅ ${battalion.owner} ${battalion.type} ARRIVED at node ${updatedMovementState.targetPosition.nodeIndex}`);
            
            const finalPosition = updatedMovementState.wasInterrupted && updatedMovementState.interruptionPosition 
              ? updatedMovementState.interruptionPosition 
              : updatedMovementState.targetPosition;
              
            if (updatedMovementState.wasInterrupted) {
              console.log(`🛑 INTERRUPTED ARRIVAL: ${battalion.owner} ${battalion.type} stopped at interruption position (${finalPosition.x.toFixed(1)}, ${finalPosition.y.toFixed(1)}) on node ${finalPosition.nodeIndex}`);
            }
            
            if (battalion.position.nodeIndex !== finalPosition.nodeIndex || 
                Math.abs(battalion.position.x - finalPosition.x) > 0.1 || 
                Math.abs(battalion.position.y - finalPosition.y) > 0.1) {
              battalion.position.nodeIndex = finalPosition.nodeIndex;
              battalion.position.x = finalPosition.x;
              battalion.position.y = finalPosition.y;
              positionUpdated = true;
              
              if (updatedMovementState.wasInterrupted) {
                console.log(`💾 INTERRUPT POSITION SAVED: ${battalion.owner} ${battalion.type} position updated to interruption location node ${battalion.position.nodeIndex} at (${battalion.position.x.toFixed(1)}, ${battalion.position.y.toFixed(1)})`);
              } else {
                console.log(`📊 POSITION UPDATE: ${battalion.owner} ${battalion.type}-type battalion position updated to node ${battalion.position.nodeIndex}`);
              }
            }
            
            if (updatedMovementState.movementType === 'interrupted_recovery' && updatedMovementState.needsRetargetingOnArrival) {
              console.log(`🎯 RECOVERY COMPLETE: ${battalion.owner} ${battalion.type} reached nearest node ${battalion.position.nodeIndex}, triggering retargeting`);
              
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
                  
                  if (enemyBattalion) {
                    console.log(`🎯 SPECIFIC TARGET: ${battalion.owner} ${battalion.type} found specific target ${enemyBattalion.owner} ${enemyBattalion.type} (${enemyBattalion.id}) at node ${enemyBattalion.position.nodeIndex}`);
                  } else {
                    console.log(`🎯 SPECIFIC TARGET MISSING: ${battalion.owner} ${battalion.type} cannot find specific target ${targetingResult.targetBattalionId} (may be destroyed or moved)`);
                  }
                } else {
                  enemyBattalion = battle.battalions.find((b: IBattalion) => 
                    b.owner !== battalion.owner && 
                    b.position.nodeIndex === updatedMovementState.targetPosition.nodeIndex && !b.isDestroyed
                  );
                  
                  if (enemyBattalion) {
                    console.log(`🎯 FALLBACK TARGET: ${battalion.owner} ${battalion.type} found fallback target ${enemyBattalion.owner} ${enemyBattalion.type} at node ${enemyBattalion.position.nodeIndex}`);
                  }
                }
                
                if (enemyBattalion) {
                  console.log(`⚔️ BATTALION COMBAT: ${battalion.owner} ${battalion.type} starting to attack ${enemyBattalion.owner} ${enemyBattalion.type} at node ${enemyBattalion.position.nodeIndex}`);
                  AttackService.startBattalionAttack(battalion, enemyBattalion.id);
                } else {
                  console.log(`📊 NO BATTALION TARGET: ${battalion.owner} ${battalion.type} cannot find any enemy battalion to attack (target may be destroyed or moved)`);
                  console.log(`🎯 MISSING TARGET: Target not found for ${battalion.owner} ${battalion.type}, will be handled by AttackService queue`);
                  AttackService.queueMissingTargetRetargeting(battle.battleId, battalion.id);
                }
              } else {
                const targetNode = battle.nodes.find((n: any) => n.index === updatedMovementState.targetPosition.nodeIndex);
                if (targetNode && CombatService.canTargetNode(targetNode)) {
                  console.log(`📊 ATTACK INITIATION: ${battalion.owner} ${battalion.type}-type battalion at position node ${battalion.position.nodeIndex} starting to attack node ${targetNode.index}`);
                  AttackService.startAttacking(battalion, targetNode.index);
                } else {
                  console.log(`📊 NO ATTACK: ${battalion.owner} ${battalion.type}-type battalion at position node ${battalion.position.nodeIndex} cannot attack node ${updatedMovementState.targetPosition.nodeIndex} (node owner: ${targetNode?.owner}, canTarget: ${targetNode ? CombatService.canTargetNode(targetNode) : 'no node'})`);
                }
              }
            } else {
              console.log(`📊 ALREADY ATTACKING: ${battalion.owner} ${battalion.type}-type battalion at position node ${battalion.position.nodeIndex} is already attacking`);
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
          console.log(`🚀 INITIATING: ${battalion.owner} ${battalion.type} movement to node ${targetResult.targetNode}`);
          
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
          } else {
            console.log(`❌ MOVEMENT ERROR: Failed to initiate movement for battalion ${battalion.id}`);
          }
        }
      }
    }
    
    if (positionUpdated) {
      await battle.save();
      console.log(`💾 BATTLE SAVED: Updated battalion positions saved to database`);
    }
    
    if (activeMovements > 0 && Date.now() % 2000 < 100) {
      console.log(`📊 ACTIVE MOVEMENTS: ${activeMovements} battalions moving`);
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
    console.log(`🚀 MOVEMENT INITIATION [${source}]: ${battalion.owner} ${battalion.type} (${movementType}) to node ${targetNode}`);
    
    const nodePositions = calculateNodePositions(screenWidth, screenHeight);
    const startPosition = {
      x: nodePositions[battalion.position.nodeIndex].position.x,
      y: nodePositions[battalion.position.nodeIndex].position.y,
      nodeIndex: battalion.position.nodeIndex
    };
    
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
      console.log(`🎯 INITIAL ERROR: No direct path to node ${targetNode}`);
      return undefined;
    }
    
    const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
      battalion, targetNode, nodePositions.map(n => n.position)
    );
    
    const isReachable = PathfindingService.isNetworkReachable(battalion.position.nodeIndex, targetNode);
    if (!isReachable) {
      console.log(`🎯 INITIAL ERROR: Target node ${targetNode} not reachable via network from ${battalion.position.nodeIndex}`);
      return undefined;
    }
    
    const duration = MovementCalculationService.calculateMovementDuration(battalion);
    console.log(`⏱️ INITIAL SPEED: ${battalion.type} (speed=${battalion.stats.speed}) → ${duration}ms`);
    
    return {
      battalionId: battalion.id,
      startPosition: startPosition,
      targetPosition: { x: attackRangePosition.x, y: attackRangePosition.y, nodeIndex: targetNode },
      movementStatus: 'moving',
      startTime: Date.now(),
      estimatedDuration: duration,
      networkPath: networkPath,
      attackRangePosition: { x: attackRangePosition.x, y: attackRangePosition.y },
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
      console.log(`🔄 RETARGETING ERROR: No path provided`);
      return undefined;
    }
    
    if (fullPath.length === 1) {
      console.log(`🎯 SAME-NODE MOVEMENT: ${battalion.owner} ${battalion.type} targeting enemy battalion at same node ${targetNode} - positioning at attack range`);
      
      if (!battle || !battle.battalions) {
        console.log(`❌ SAME-NODE ERROR: Cannot access battle data for same-node positioning`);
        return undefined;
      }
      
      const targetBattalion = battle.battalions.find((b: any) => 
        b.owner !== battalion.owner && b.position.nodeIndex === targetNode
      );
      
      if (!targetBattalion) {
        console.log(`❌ SAME-NODE ERROR: Target battalion not found at node ${targetNode}`);
        return undefined;
      }
      
      const baseAttackRange = battalion.stats.range || 50;
      const sameNodeAttackRange = Math.min(baseAttackRange, 15);
      const targetX = targetBattalion.position.x;
      const targetY = targetBattalion.position.y;
      const currentX = startPosition.x;
      const currentY = startPosition.y;
      
      console.log(`📊 CURRENT POSITIONS: ${battalion.owner} ${battalion.type} at (${currentX.toFixed(1)}, ${currentY.toFixed(1)}), target ${targetBattalion.owner} ${targetBattalion.type} at (${targetX.toFixed(1)}, ${targetY.toFixed(1)})`);
      
      let attackRangeX, attackRangeY;
      
      const nodePosition = nodePositions[targetNode].position;
      const nodeX = nodePosition.x;
      
      if (battalion.owner === 'user') {
        attackRangeX = nodeX - sameNodeAttackRange;
        console.log(`📊 POSITIONING LOGIC: ${battalion.owner} ${battalion.type} positioned on LEFT side of node (deterministic user positioning, range: ${sameNodeAttackRange}px)`);
      } else {
        attackRangeX = nodeX + sameNodeAttackRange;
        console.log(`📊 POSITIONING LOGIC: ${battalion.owner} ${battalion.type} positioned on RIGHT side of node (deterministic enemy positioning, range: ${sameNodeAttackRange}px)`);
      }
      
      attackRangeY = nodePosition.y;
      
      const nodeRadius = 25;
      const clampedX = Math.max(nodePosition.x - nodeRadius, Math.min(nodePosition.x + nodeRadius, attackRangeX));
      const clampedY = Math.max(nodePosition.y - nodeRadius, Math.min(nodePosition.y + nodeRadius, attackRangeY));
      
      const attackRangePosition = { x: clampedX, y: clampedY };
      
      const distance = Math.sqrt(Math.pow(attackRangePosition.x - currentX, 2) + Math.pow(attackRangePosition.y - currentY, 2));
      const duration = Math.max(500, Math.min(1500, distance * 15));
      
      console.log(`📊 SAME-NODE POSITIONING: ${battalion.owner} ${battalion.type} moving ${distance.toFixed(1)}px from (${currentX.toFixed(1)}, ${currentY.toFixed(1)}) to (${attackRangePosition.x.toFixed(1)}, ${attackRangePosition.y.toFixed(1)}) (duration: ${duration}ms)`);
      console.log(`📊 TARGET DISTANCE: Final distance to ${targetBattalion.owner} ${targetBattalion.type} will be approximately ${Math.abs(attackRangePosition.x - targetX).toFixed(1)}px`);
      
      return {
        battalionId: battalion.id,
        startPosition: startPosition,
        targetPosition: { x: attackRangePosition.x, y: attackRangePosition.y, nodeIndex: targetNode },
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
      console.log(`🔄 RETARGETING ERROR: Invalid path length ${fullPath.length} for multi-hop movement`);
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
      targetPosition = { x: attackRangePosition.x, y: attackRangePosition.y, nodeIndex: nextNodeIndex };
      stepDistance = MovementCalculationService.calculateNetworkDistance(
        nodePositions[battalion.position.nodeIndex].position, 
        attackRangePosition
      );
    } else {
      targetPosition = {
        x: nodePositions[nextNodeIndex].position.x,
        y: nodePositions[nextNodeIndex].position.y,
        nodeIndex: nextNodeIndex
      };
      stepDistance = MovementCalculationService.calculateNetworkDistance(
        nodePositions[battalion.position.nodeIndex].position,
        nodePositions[nextNodeIndex].position
      );
    }
    
    const duration = MovementCalculationService.calculateMovementDuration(battalion);
    console.log(`⏱️ RETARGET SPEED: ${battalion.type} (speed=${battalion.stats.speed}) → ${duration}ms`);
    
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
      console.log(`✅ ARRIVAL: Battalion ${movementState.battalionId} arrived at node ${movementState.targetPosition.nodeIndex}`);
      
      if (movementState.movementType === 'retargeting' && movementState.fullPath && movementState.fullPath.length === 1) {
        console.log(`📊 POSITIONING COMPLETE: Battalion ${movementState.battalionId} finished ${elapsedTime}ms positioning movement (target duration: ${movementState.estimatedDuration}ms)`);
      }
      
      if (movementState.movementType === 'retargeting' && movementState.fullPath && movementState.currentPathIndex !== undefined) {
        const nextPathIndex = movementState.currentPathIndex + 1;
        const hasMoreSteps = nextPathIndex < movementState.fullPath.length - 1;
        
        if (hasMoreSteps) {
          const nextNodeIndex = movementState.fullPath[nextPathIndex + 1];
          const isLastStep = nextPathIndex + 1 === movementState.fullPath.length - 1;
          
          console.log(`🔄 CONTINUING: Battalion ${movementState.battalionId} continuing to node ${nextNodeIndex} (step ${nextPathIndex + 1}/${movementState.fullPath.length - 1})`);
          
          let nodePositions;
          try {
            const { ScreenDimensionService } = require('./ScreenDimensionService');
            const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
            
            if (!screenDimensions || !screenDimensions.width || !screenDimensions.height) {
              console.log(`❌ POSITION ERROR: Screen dimensions not available for ${movementState.battalionId}, movement may jump off-network`);
              const fallbackDimensions = { width: 800, height: 600 };
              nodePositions = calculateNodePositions(fallbackDimensions.width, fallbackDimensions.height);
            } else {
              console.log(`✅ POSITION OK: Using actual screen dimensions ${screenDimensions.width}x${screenDimensions.height} for ${movementState.battalionId}`);
              nodePositions = calculateNodePositions(screenDimensions.width, screenDimensions.height);
            }
          } catch (error) {
            console.log(`❌ POSITION ERROR: Screen dimensions error for ${movementState.battalionId}, movement may jump off-network:`, error instanceof Error ? error.message : 'Unknown error');
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
              console.log(`🔄 CONTINUING ERROR: Battalion ${movementState.battalionId} not found in battle data`);
              movementState.targetPosition = {
                x: nodePositions[nextNodeIndex].position.x,
                y: nodePositions[nextNodeIndex].position.y,
                nodeIndex: nextNodeIndex
              };
            } else {
              const currentNodeIndex = movementState.fullPath![movementState.currentPathIndex!];
              
              if (!actualBattalion.stats) {
                console.log(`❌ STATS ERROR: Battalion ${movementState.battalionId} has no stats:`, actualBattalion);
                movementState.targetPosition = {
                  x: nodePositions[nextNodeIndex].position.x,
                  y: nodePositions[nextNodeIndex].position.y,
                  nodeIndex: nextNodeIndex
                };
              } else {
                const battalionAtCurrentPosition = {
                  ...actualBattalion,
                  position: { ...actualBattalion.position, nodeIndex: currentNodeIndex },
                  stats: actualBattalion.stats
                };
                
                const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
                  battalionAtCurrentPosition,
                  nextNodeIndex,
                  nodePositions.map(n => n.position)
                );
                movementState.targetPosition = { 
                  x: attackRangePosition.x, 
                  y: attackRangePosition.y, 
                  nodeIndex: nextNodeIndex 
                };
                console.log(`📍 POSITION: ${movementState.battalionId} final step from node ${currentNodeIndex} to node ${nextNodeIndex} at attack range (${movementState.targetPosition.x}, ${movementState.targetPosition.y})`);
              }
            }
          } else {
            movementState.targetPosition = {
              x: nodePositions[nextNodeIndex].position.x,
              y: nodePositions[nextNodeIndex].position.y,
              nodeIndex: nextNodeIndex
            };
            console.log(`📍 POSITION: ${movementState.battalionId} intermediate step to node ${nextNodeIndex} at (${movementState.targetPosition.x}, ${movementState.targetPosition.y})`);
          }
          
          const stepDistance = MovementCalculationService.calculateNetworkDistance(
            movementState.startPosition,
            movementState.targetPosition
          );
          
          const battalionForSpeed = battle?.battalions?.find((b: any) => b.id === movementState.battalionId);
          if (!battalionForSpeed) {
            console.log(`🔄 CONTINUING ERROR: Battalion ${movementState.battalionId} not found for speed calculation`);
            movementState.estimatedDuration = 2000;
          } else {
            const duration = MovementCalculationService.calculateMovementDuration(battalionForSpeed);
            console.log(`⏱️ CONTINUE SPEED: ${battalionForSpeed.type} (speed=${battalionForSpeed.stats.speed}) → ${duration}ms`);
            movementState.estimatedDuration = duration;
            movementState.startTime = Date.now();
            console.log(`🔄 TIMING: ${battalionForSpeed.type} next step starts now, will complete in ${duration}ms`);
            
            return {
              ...movementState,
              movementStatus: 'moving'
            };
          }
        } else {
          console.log(`🏆 FINAL ARRIVAL: Battalion ${movementState.battalionId} reached final target node ${movementState.finalTarget}`);
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
      console.log(`🛑 INTERRUPT: Battalion ${battalionId} not interruptible`);
      return false;
    }

    console.log(`🛑 INTERRUPT: Stopping retargeting movement for battalion ${battalionId}`);

    const { MovementCalculationService } = require('./MovementCalculationService');
    const currentPosition = MovementCalculationService.calculateCurrentMovementPosition(movementState);
    
    console.log(`🛑 INTERRUPT POSITION: Battalion ${battalionId} stopped at coordinates (${currentPosition.x.toFixed(1)}, ${currentPosition.y.toFixed(1)}) nearest to node ${currentPosition.nodeIndex}`);
    
    movementState.targetPosition = currentPosition;
    movementState.movementStatus = 'arrived';
    movementState.wasInterrupted = true;
    movementState.interruptionPosition = currentPosition;
    
    console.log(`💾 INTERRUPT UPDATE: Battalion ${battalionId} movement state updated with interruption coordinates`);
    
    battleMovementStates.set(battalionId, movementState);

    return true;
  }

  static initiateMovementToNearestNode(battalion: any, interruptionPosition: any, battleId: string): void {
    console.log(`🚀 RECOVERY MOVEMENT [INTERRUPTION_RECOVERY]: ${battalion.owner} ${battalion.type} movement from interruption position to nearest node ${interruptionPosition.nodeIndex}`);
    
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
    
    console.log(`⏱️ RECOVERY DISTANCE: ${actualDistance.toFixed(1)}px → ${proportionalDuration}ms (was ${fullMovementDuration}ms)`);

    const movementState = {
      battalionId: battalion.id,
      startPosition: { 
        x: interruptionPosition.x, 
        y: interruptionPosition.y, 
        nodeIndex: battalion.position.nodeIndex
      },
      targetPosition: {
        x: targetNodePosition.position.x,
        y: targetNodePosition.position.y,
        nodeIndex: interruptionPosition.nodeIndex
      },
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
    
    console.log(`🚀 RECOVERY MOVEMENT: ${battalion.owner} ${battalion.type} moving from (${interruptionPosition.x.toFixed(1)}, ${interruptionPosition.y.toFixed(1)}) to node ${interruptionPosition.nodeIndex} at (${targetNodePosition.position.x}, ${targetNodePosition.position.y})`);
  }

  static getArrivedBattalions(movementStates: Map<string, MovementState>): MovementState[] {
    return Array.from(movementStates.values()).filter(
      state => state.movementStatus === 'arrived'
    );
  }

  // ============================================================================
  // CENTRALIZED MOVEMENT STATE COORDINATION
  // ============================================================================

  static async coordinateMovementState(battleId: string, battle: any, targetingResults: any[]): Promise<void> {
    if (!battle) return;

    if (battle.phase === 'COMPLETE') {
      console.log(`⏹️ BATTLE ENDED: Skipping movement processing for completed battle ${battleId}`);
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
      console.log(`🔄 MOVEMENT PROGRESSION: ${currentType} → ${newType}`);
    } else {
      console.log(`⚠️ INVALID MOVEMENT TRANSITION: ${currentType} → ${newType} (allowed: ${allowedTransitions.join(', ')})`);
    }
  }
} 