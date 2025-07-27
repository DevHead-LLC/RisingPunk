import { calculateNodePositions } from '../services/NodeService';
import { TargetingService } from './TargetingService';
import { IBattalion } from '../types/battle';
import { MovementState } from '../types/battle';
import { NodePosition } from '../../../mobile/src/types/battleTypes';
import { MovementCalculationService } from './MovementCalculationService';
import { ScreenDimensionService } from './ScreenDimensionService';
import { PathfindingService } from './PathfindingService';

export class MovementService {
  private static movementStates: Map<string, Map<string, MovementState>> = new Map(); // battleId -> battalionId -> MovementState
  private static movementIntervals: Map<string, NodeJS.Timeout> = new Map(); // battleId -> movement interval

  /**
   * Get movement states for a specific battle
   */
  static getMovementStates(battleId: string): Map<string, MovementState> {
    return this.movementStates.get(battleId) || new Map();
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
    
    // Clean up screen dimensions but preserve movement states for final positions
    ScreenDimensionService.clearBattleScreenDimensions(battleId);
    // Don't clear movement states - preserve final battalion positions when battle ends
  }

  /**
   * Update battle movement for all battalions (called every 100ms)
   * STREAMLINED: Consolidated movement→attack transitions
   */
  static async updateBattleMovement(battleId: string, battle: any, targetingResults: any[]): Promise<void> {
    if (!battle) return;

    // Ensure movement states map exists for this battle
    if (!this.movementStates.has(battleId)) {
      this.movementStates.set(battleId, new Map());
    }
    
    const battleMovementStates = this.movementStates.get(battleId)!;
    let activeMovements = 0;
    let positionUpdated = false;
    
    // Process existing movement states (including retargeting movements)
    for (const [battalionId, movementState] of battleMovementStates) {
      if (movementState.movementStatus === 'moving') {
        // Check if movement is complete using updateMovementProgress()
        const updatedMovementState = this.updateMovementProgress(movementState, battleId, battle);
        battleMovementStates.set(battalionId, updatedMovementState);
        
        // Handle movement→attack transitions for arrived battalions
        if (updatedMovementState.movementStatus === 'arrived') {
          const battalion = battle.battalions.find((b: IBattalion) => b.id === battalionId);
          if (battalion) {
            console.log(`✅ ${battalion.owner} ${battalion.type} ARRIVED at node ${updatedMovementState.targetPosition.nodeIndex}`);
            
            // DETAILED LOGGING: Show battalion arrival details
            console.log(`📊 ARRIVAL DETAILS: ${battalion.owner} ${battalion.type}-type battalion arrived at position node ${updatedMovementState.targetPosition.nodeIndex} from previous position node ${battalion.position.nodeIndex}`);
            
            // Enhanced logging for same-node movement completion
            if (updatedMovementState.movementType === 'retargeting' && updatedMovementState.fullPath && updatedMovementState.fullPath.length === 1) {
              console.log(`📊 SAME-NODE ARRIVAL: ${battalion.owner} ${battalion.type} final position: (${updatedMovementState.targetPosition.x.toFixed(1)}, ${updatedMovementState.targetPosition.y.toFixed(1)})`);
              
              // Show distance to other battalions at the same node for verification
              const sameBattalions = battle.battalions.filter((b: IBattalion) => 
                b.id !== battalion.id && b.position.nodeIndex === updatedMovementState.targetPosition.nodeIndex
              );
              for (const other of sameBattalions) {
                const actualDistance = Math.sqrt(
                  Math.pow(updatedMovementState.targetPosition.x - other.position.x, 2) + 
                  Math.pow(updatedMovementState.targetPosition.y - other.position.y, 2)
                );
                console.log(`📊 ACTUAL DISTANCE: ${battalion.owner} ${battalion.type} to ${other.owner} ${other.type} = ${actualDistance.toFixed(1)}px`);
              }
            }
            
            // Update battalion position if it changed
            if (battalion.position.nodeIndex !== updatedMovementState.targetPosition.nodeIndex) {
              battalion.position.nodeIndex = updatedMovementState.targetPosition.nodeIndex;
              battalion.position.x = updatedMovementState.targetPosition.x;
              battalion.position.y = updatedMovementState.targetPosition.y;
              positionUpdated = true;
              console.log(`📊 POSITION UPDATE: ${battalion.owner} ${battalion.type}-type battalion position updated to node ${battalion.position.nodeIndex}`);
            }
            
            // Start attacking if not already attacking and target is valid
            // PHASE 2 ENHANCEMENT: Now determines attack target based on targeting result
            const { AttackService } = require('./AttackService');
            const { CombatService } = require('./CombatService');
            const { BattalionService } = require('./BattalionService');
            
            if (!AttackService.isAttacking(battalion.id)) {
              // PHASE 2: Check the targeting result to determine what to attack (battalion vs node)
              const targetingResult = BattalionService.getTargetingResultForBattalion(battalion.id, battleId);
              
              if (targetingResult && targetingResult.targetType === 'enemy_battalion') {
                // BATTALION TARGET: Find the specific enemy battalion to attack
                // PHASE 4: Use targetBattalionId for precise targeting when available
                let enemyBattalion: IBattalion | undefined;
                
                if (targetingResult.targetBattalionId) {
                  // PHASE 4: Find the specific target battalion by ID (most precise)
                  enemyBattalion = battle.battalions.find((b: IBattalion) => 
                    b.id === targetingResult.targetBattalionId &&
                    !b.isDestroyed  // Ensure target is still alive
                  );
                  
                  if (enemyBattalion) {
                    console.log(`🎯 SPECIFIC TARGET: ${battalion.owner} ${battalion.type} found specific target ${enemyBattalion.owner} ${enemyBattalion.type} (${enemyBattalion.id}) at node ${enemyBattalion.position.nodeIndex}`);
                  } else {
                    console.log(`🎯 SPECIFIC TARGET MISSING: ${battalion.owner} ${battalion.type} cannot find specific target ${targetingResult.targetBattalionId} (may be destroyed or moved)`);
                  }
                } else {
                  // PHASE 2 FALLBACK: Find any enemy battalion at this node (less precise)
                  enemyBattalion = battle.battalions.find((b: IBattalion) => 
                    b.owner !== battalion.owner && 
                    b.position.nodeIndex === updatedMovementState.targetPosition.nodeIndex &&
                    !b.isDestroyed  // Only target alive battalions
                  );
                  
                  if (enemyBattalion) {
                    console.log(`🎯 FALLBACK TARGET: ${battalion.owner} ${battalion.type} found fallback target ${enemyBattalion.owner} ${enemyBattalion.type} at node ${enemyBattalion.position.nodeIndex}`);
                  }
                }
                
                if (enemyBattalion) {
                  console.log(`⚔️ BATTALION COMBAT: ${battalion.owner} ${battalion.type} starting to attack ${enemyBattalion.owner} ${enemyBattalion.type} at node ${enemyBattalion.position.nodeIndex}`);
                  // PHASE 2: Now implemented - start battalion combat with correct parameters
                  AttackService.startBattalionAttack(battalion, enemyBattalion.id);
                } else {
                  console.log(`📊 NO BATTALION TARGET: ${battalion.owner} ${battalion.type} cannot find any enemy battalion to attack (target may be destroyed or moved)`);
                }
              } else {
                // NODE TARGET: Original node attack logic for neutral nodes
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
    
    // Process new targeting results (initial movements)
    if (targetingResults.length > 0) {
      for (const targetResult of targetingResults) {
        const battalion = battle.battalions.find((b: IBattalion) => b.id === targetResult.battalionId);
        if (!battalion || targetResult.targetNode === -1) continue;

        // Check if movement already exists for this battalion
        let movementState = battleMovementStates.get(battalion.id);
        
        // Check if battalion needs movement initiation
        if (!movementState) {
          console.log(`🚀 INITIATING: ${battalion.owner} ${battalion.type} movement to node ${targetResult.targetNode}`);
          
          // Get screen dimensions for movement calculation
          const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
          
          movementState = this.initiateMovement(
            battalion,
            targetResult.targetNode,
            screenDimensions.width,
            screenDimensions.height,
            'initial'  // FIXED: Use 'initial' for initial targeting, not 'retargeting'
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
    
    // Save battle state if positions were updated
    if (positionUpdated) {
      await battle.save();
      console.log(`💾 BATTLE SAVED: Updated battalion positions saved to database`);
    }
    
    // Log active movements periodically
    if (activeMovements > 0 && Date.now() % 2000 < 100) { // Every ~2 seconds
      console.log(`📊 ACTIVE MOVEMENTS: ${activeMovements} battalions moving`);
    }
  }

  /**
   * Initiate movement for a battalion to a target node using existing network validation (PHASE 4: Enhanced with movement types)
   */
  static initiateMovement(
    battalion: IBattalion, 
    targetNode: number, 
    screenWidth: number, 
    screenHeight: number,
    movementType: 'initial' | 'retargeting' = 'initial',
    fullPath?: number[],  // Required for retargeting
    battle?: any  // Required for same-node targeting
  ): MovementState | undefined {
    

    
    const nodePositions = calculateNodePositions(screenWidth, screenHeight);
    const startPosition = {
      x: nodePositions[battalion.position.nodeIndex].position.x,
      y: nodePositions[battalion.position.nodeIndex].position.y,
      nodeIndex: battalion.position.nodeIndex
    };
    
    if (movementType === 'initial') {
      return this.initiateInitialMovement(battalion, targetNode, nodePositions, startPosition);
    } else if (movementType === 'retargeting') {
      return this.initiateRetargetingMovement(battalion, targetNode, fullPath!, nodePositions, startPosition, battle);
    }
    
    return undefined;
  }

  /**
   * Initial movement - direct to attack range (existing logic)
   * 
   * ⚠️ CRITICAL: DO NOT MODIFY THIS METHOD! ⚠️
   * 
   * This method is INTENDED to use direct connections only. Initial targeting:
   * - Picks random neutral nodes
   * - Uses direct network connections (no multi-hop paths)
   * - Moves directly to attack range position
   * - This is WORKING CORRECTLY and should NOT be changed
   * 
   * The sequential movement system is ONLY for retargeting (Phase 3+).
   * Initial movement should remain simple and direct.
   */
  private static initiateInitialMovement(battalion: IBattalion, targetNode: number, nodePositions: any[], startPosition: any): MovementState | undefined {
    // Use existing TargetingService.getNetworkPath for direct connections
    const networkPath = TargetingService.getNetworkPath(battalion.position.nodeIndex, targetNode);
    
    if (networkPath.length === 0) {
      console.log(`🎯 INITIAL ERROR: No direct path to node ${targetNode}`);
      return undefined;
    }
    
    // Calculate attack range position (existing logic)
    const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
      battalion, targetNode, nodePositions.map(n => n.position)
    );
    
    // Validate network reachability (not direct line-of-sight)
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
      isInterruptible: false  // Initial movement cannot be interrupted
    };
  }

  /**
   * Retargeting movement - sequential through nodes with proper speed timing
   * 
   * This method uses the NEW sequential movement system (Phase 4):
   * - Uses PathfindingService for multi-hop paths
   * - Moves through intermediate nodes sequentially
   * - Calculates step-by-step timing based on battalion speed
   * - This is DIFFERENT from initial movement (which is direct only)
   */
  private static initiateRetargetingMovement(battalion: IBattalion, targetNode: number, fullPath: number[], nodePositions: any[], startPosition: any, battle?: any): MovementState | undefined {
    if (!fullPath || fullPath.length === 0) {
      console.log(`🔄 RETARGETING ERROR: No path provided`);
      return undefined;
    }
    
    // FIXED: Handle same-node targeting (path length = 1)
    if (fullPath.length === 1) {
      console.log(`🎯 SAME-NODE MOVEMENT: ${battalion.owner} ${battalion.type} targeting enemy battalion at same node ${targetNode} - positioning at attack range`);
      
      // For same-node targeting, find the target battalion and calculate attack range relative to its position
      // This requires battle context to find the target battalion
      if (!battle || !battle.battalions) {
        console.log(`❌ SAME-NODE ERROR: Cannot access battle data for same-node positioning`);
        return undefined;
      }
      
      // Find the target battalion at the same node
      const targetBattalion = battle.battalions.find((b: any) => 
        b.owner !== battalion.owner && 
        b.position.nodeIndex === targetNode
      );
      
      if (!targetBattalion) {
        console.log(`❌ SAME-NODE ERROR: Target battalion not found at node ${targetNode}`);
        return undefined;
      }
      
      // Calculate attack range position relative to the target battalion's actual position
      // FIXED: Use smaller attack range for same-node targeting to keep battalions closer
      const baseAttackRange = battalion.stats.range || 50;
      const sameNodeAttackRange = Math.min(baseAttackRange, 15); // Reduced from 25 to 15px for closer positioning
      const targetX = targetBattalion.position.x;
      const targetY = targetBattalion.position.y;
      const currentX = startPosition.x;
      const currentY = startPosition.y;
      
      console.log(`📊 CURRENT POSITIONS: ${battalion.owner} ${battalion.type} at (${currentX.toFixed(1)}, ${currentY.toFixed(1)}), target ${targetBattalion.owner} ${targetBattalion.type} at (${targetX.toFixed(1)}, ${targetY.toFixed(1)})`);
      
      // FIXED: Deterministic positioning to prevent simultaneous crossover
      // Instead of using current positions (which causes both to cross), use consistent rules:
      // - User battalions ALWAYS position on the LEFT side of enemy battalions
      // - Enemy battalions ALWAYS position on the RIGHT side of user battalions
      // This prevents the simultaneous positioning crossover bug
      let attackRangeX, attackRangeY;
      
      // Get the node center as the baseline for positioning
      const nodePosition = nodePositions[targetNode].position;
      const nodeX = nodePosition.x;
      
      if (battalion.owner === 'user') {
        // User battalions ALWAYS go to the LEFT side of the node center
        attackRangeX = nodeX - sameNodeAttackRange;
        console.log(`📊 POSITIONING LOGIC: ${battalion.owner} ${battalion.type} positioned on LEFT side of node (deterministic user positioning, range: ${sameNodeAttackRange}px)`);
      } else {
        // Enemy battalions ALWAYS go to the RIGHT side of the node center  
        attackRangeX = nodeX + sameNodeAttackRange;
        console.log(`📊 POSITIONING LOGIC: ${battalion.owner} ${battalion.type} positioned on RIGHT side of node (deterministic enemy positioning, range: ${sameNodeAttackRange}px)`);
      }
      
      attackRangeY = nodePosition.y; // Use node center Y position
      
      // FIXED: Tighter bounds checking to keep battalions closer to node center
      const nodeRadius = 25; // Reduced from 30 to 25px for tighter bounds
      const clampedX = Math.max(nodePosition.x - nodeRadius, Math.min(nodePosition.x + nodeRadius, attackRangeX));
      const clampedY = Math.max(nodePosition.y - nodeRadius, Math.min(nodePosition.y + nodeRadius, attackRangeY));
      
      const attackRangePosition = { x: clampedX, y: clampedY };
      
      // Calculate movement distance and duration for smooth animation
      const distance = Math.sqrt(Math.pow(attackRangePosition.x - currentX, 2) + Math.pow(attackRangePosition.y - currentY, 2));
      const duration = Math.max(500, Math.min(1500, distance * 15)); // Increased minimum from 300ms to 500ms for better detection
      
      console.log(`📊 SAME-NODE POSITIONING: ${battalion.owner} ${battalion.type} moving ${distance.toFixed(1)}px from (${currentX.toFixed(1)}, ${currentY.toFixed(1)}) to (${attackRangePosition.x.toFixed(1)}, ${attackRangePosition.y.toFixed(1)}) (duration: ${duration}ms)`);
      console.log(`📊 TARGET DISTANCE: Final distance to ${targetBattalion.owner} ${targetBattalion.type} will be approximately ${Math.abs(attackRangePosition.x - targetX).toFixed(1)}px`);
      
      return {
        battalionId: battalion.id,
        startPosition: startPosition,
        targetPosition: { x: attackRangePosition.x, y: attackRangePosition.y, nodeIndex: targetNode },
        movementStatus: 'moving', // FIXED: Use 'moving' for smooth animation instead of instant 'arrived'
        startTime: Date.now(),
        estimatedDuration: duration, // FIXED: Use calculated duration based on distance
        networkPath: fullPath,
        attackRangePosition: { x: attackRangePosition.x, y: attackRangePosition.y },
        isWithinAttackRange: false, // FIXED: Will become true when movement completes
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
    
    // Start with first step in path
    const nextNodeIndex = fullPath[1]; // fullPath[0] is current position
    const isLastStep = fullPath.length === 2;
    
    let targetPosition;
    let stepDistance;
    
    if (isLastStep) {
      // Moving to final target - use attack range position
      const attackRangePosition = MovementCalculationService.calculateAttackRangePosition(
        battalion, nextNodeIndex, nodePositions.map(n => n.position)
      );
      targetPosition = { x: attackRangePosition.x, y: attackRangePosition.y, nodeIndex: nextNodeIndex };
      stepDistance = MovementCalculationService.calculateNetworkDistance(
        nodePositions[battalion.position.nodeIndex].position, 
        attackRangePosition
      );
    } else {
      // Moving to intermediate node - use node center for network access
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
      estimatedDuration: duration, // FIXED: Use same speed as initial movement
      networkPath: [battalion.position.nodeIndex, nextNodeIndex],
      attackRangePosition: { x: targetPosition.x, y: targetPosition.y },
      isWithinAttackRange: false,
      movementType: 'retargeting',
      fullPath: fullPath,
      currentPathIndex: 0,
      finalTarget: fullPath[fullPath.length - 1],
      isInterruptible: true  // Can be interrupted by captures
    };
  }



  /**
   * Update movement progress and determine if movement is complete (PHASE 4: Enhanced with sequential movement)
   * NOTE: This is a time-based approach, not position-based
   */
  static updateMovementProgress(movementState: MovementState, battleId: string, battle?: any): MovementState {
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
      console.log(`✅ ARRIVAL: Battalion ${movementState.battalionId} arrived at node ${movementState.targetPosition.nodeIndex}`);
      
      // Enhanced logging for positioning movement completion
      if (movementState.movementType === 'retargeting' && movementState.fullPath && movementState.fullPath.length === 1) {
        console.log(`📊 POSITIONING COMPLETE: Battalion ${movementState.battalionId} finished ${elapsedTime}ms positioning movement (target duration: ${movementState.estimatedDuration}ms)`);
      }
      
      // For retargeting movement, check if there are more steps
      if (movementState.movementType === 'retargeting' && movementState.fullPath && movementState.currentPathIndex !== undefined) {
        const nextPathIndex = movementState.currentPathIndex + 1;
        const hasMoreSteps = nextPathIndex < movementState.fullPath.length - 1;
        
        if (hasMoreSteps) {
          // Continue to next node in path
          const nextNodeIndex = movementState.fullPath[nextPathIndex + 1];
          const isLastStep = nextPathIndex + 1 === movementState.fullPath.length - 1;
          
          console.log(`🔄 CONTINUING: Battalion ${movementState.battalionId} continuing to node ${nextNodeIndex} (step ${nextPathIndex + 1}/${movementState.fullPath.length - 1})`);
          
          // Get screen dimensions for position calculation
          let nodePositions;
          try {
            const { ScreenDimensionService } = require('./ScreenDimensionService');
            const screenDimensions = ScreenDimensionService.getBattleScreenDimensions(battleId);
            
            if (!screenDimensions || !screenDimensions.width || !screenDimensions.height) {
              console.log(`❌ POSITION ERROR: Screen dimensions not available for ${movementState.battalionId}, movement may jump off-network`);
              // Use fallback dimensions for continuation
              const fallbackDimensions = { width: 800, height: 600 };
              nodePositions = calculateNodePositions(fallbackDimensions.width, fallbackDimensions.height);
            } else {
              console.log(`✅ POSITION OK: Using actual screen dimensions ${screenDimensions.width}x${screenDimensions.height} for ${movementState.battalionId}`);
              nodePositions = calculateNodePositions(screenDimensions.width, screenDimensions.height);
            }
          } catch (error) {
            console.log(`❌ POSITION ERROR: Screen dimensions error for ${movementState.battalionId}, movement may jump off-network:`, error instanceof Error ? error.message : 'Unknown error');
            // Use fallback dimensions for continuation
            const fallbackDimensions = { width: 800, height: 600 };
            nodePositions = calculateNodePositions(fallbackDimensions.width, fallbackDimensions.height);
          }
          
          // Update for next step with proper timing
          movementState.currentPathIndex = nextPathIndex;
          movementState.movementStatus = 'moving';
          movementState.startTime = Date.now();
          movementState.startPosition = movementState.targetPosition;
          
          if (isLastStep) {
            // Final step - move to attack range
            // Get actual battalion data for attack range calculation
            const actualBattalion = battle?.battalions?.find((b: any) => b.id === movementState.battalionId);
            if (!actualBattalion) {
              console.log(`🔄 CONTINUING ERROR: Battalion ${movementState.battalionId} not found in battle data`);
              // Fallback to node center if battalion not found
              movementState.targetPosition = {
                x: nodePositions[nextNodeIndex].position.x,
                y: nodePositions[nextNodeIndex].position.y,
                nodeIndex: nextNodeIndex
              };
            } else {
              // Create a temporary battalion object with the current intermediate position
              const currentNodeIndex = movementState.fullPath![movementState.currentPathIndex!];
              
              // Debug: Check if actualBattalion has stats
              if (!actualBattalion.stats) {
                console.log(`❌ STATS ERROR: Battalion ${movementState.battalionId} has no stats:`, actualBattalion);
                // Fallback to node center if stats are missing
                movementState.targetPosition = {
                  x: nodePositions[nextNodeIndex].position.x,
                  y: nodePositions[nextNodeIndex].position.y,
                  nodeIndex: nextNodeIndex
                };
              } else {
                                  const battalionAtCurrentPosition = {
                    ...actualBattalion,
                    position: { ...actualBattalion.position, nodeIndex: currentNodeIndex },
                    stats: actualBattalion.stats // Ensure stats are properly copied
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
            // Intermediate step - move to node center
            movementState.targetPosition = {
              x: nodePositions[nextNodeIndex].position.x,
              y: nodePositions[nextNodeIndex].position.y,
              nodeIndex: nextNodeIndex
            };
            console.log(`📍 POSITION: ${movementState.battalionId} intermediate step to node ${nextNodeIndex} at (${movementState.targetPosition.x}, ${movementState.targetPosition.y})`);
          }
          
          // Recalculate duration for this step using actual battalion speed
          const stepDistance = MovementCalculationService.calculateNetworkDistance(
            movementState.startPosition,
            movementState.targetPosition
          );
          
          // Get actual battalion data for speed calculation
          const battalionForSpeed = battle?.battalions?.find((b: any) => b.id === movementState.battalionId);
          if (!battalionForSpeed) {
            console.log(`🔄 CONTINUING ERROR: Battalion ${movementState.battalionId} not found for speed calculation`);
            // Use fallback duration if battalion not found
            movementState.estimatedDuration = 2000; // 2 second fallback
          } else {
            const duration = MovementCalculationService.calculateMovementDuration(battalionForSpeed);
            console.log(`⏱️ CONTINUE SPEED: ${battalionForSpeed.type} (speed=${battalionForSpeed.stats.speed}) → ${duration}ms`);
            movementState.estimatedDuration = duration;
            movementState.startTime = Date.now(); // CRITICAL FIX: Reset start time for new step
            console.log(`🔄 TIMING: ${battalionForSpeed.type} next step starts now, will complete in ${duration}ms`);
            
            // CRITICAL FIX: Return immediately with 'moving' status for continuation
            return {
              ...movementState,
              movementStatus: 'moving'
            };
          }
          
 
          
        } else {
          // Reached final destination
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

  /**
   * NEW: Interrupt retargeting movement for immediate retargeting
   */
  static interruptRetargetingMovement(battalionId: string, battleId: string): boolean {
    const battleMovementStates = this.movementStates.get(battleId);
    if (!battleMovementStates) return false;
    
    const movementState = battleMovementStates.get(battalionId);
    if (!movementState || !movementState.isInterruptible) {
      console.log(`🛑 INTERRUPT: Battalion ${battalionId} not interruptible`);
      return false;
    }
    
    console.log(`🛑 INTERRUPT: Stopping retargeting movement for battalion ${battalionId}`);
    
    // Stop current movement and mark as arrived at current target
    movementState.movementStatus = 'arrived';
    battleMovementStates.set(battalionId, movementState);
    
    return true;
  }


  /**
   * Get battalions that have arrived at their destinations
   */
  static getArrivedBattalions(movementStates: Map<string, MovementState>): MovementState[] {
    return Array.from(movementStates.values()).filter(
      state => state.movementStatus === 'arrived'
    );
  }

} 