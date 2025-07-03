import { useCallback } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { calculateMovementDuration } from '../utils/battleUtils';
import { isNeutral } from '../utils/nodeOwnership';
import { validateNetworkLinePath, findNearestNetworkLine } from '../utils/pathfinding';
import { validateBattalionAndTarget } from '../utils/battleUtils';
import { handleNodePathCalculation, handleBattalionPathFollowing, setupBattalionPathFollowing } from './usePathFollowing';

// Position calculation
const getAnimatedPosition = (position: Animated.ValueXY) => {
  return {
    x: (position.x as any)._value || 0,
    y: (position.y as any)._value || 0
  };
};

// Cleanup protocol with enhanced validation
const cleanupBattalion = (battalionId: string, attackIntervals: { [key: string]: NodeJS.Timeout }) => {
  // Clean up all intervals related to this battalion
  Object.keys(attackIntervals).forEach(key => {
    if (key.includes(battalionId)) {
      clearInterval(attackIntervals[key]);
      delete attackIntervals[key];
    }
  });
};

export { getAnimatedPosition, cleanupBattalion };

const calculateMovementDistance = (
  currentPos: { x: number; y: number },
  target: { type: string; index: number; position: { x: number; y: number } },
  range: number,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[]
): { 
  moveDistance: number; 
  directionX: number; 
  directionY: number; 
  updatedDistance: number;
  rangePosition: { x: number; y: number };
} => {
  // Recalculate distance and direction after potential target position updates
  const updatedDx = target.position.x - currentPos.x;
  const updatedDy = target.position.y - currentPos.y;
  const updatedDistance = Math.sqrt(updatedDx * updatedDx + updatedDy * updatedDy);
  
  if (isNaN(updatedDistance) || updatedDistance === 0) {
    return { moveDistance: 0, directionX: 0, directionY: 0, updatedDistance: 0, rangePosition: currentPos };
  }

  const directionX = updatedDx / updatedDistance;
  const directionY = updatedDy / updatedDistance;
  
  // Calculate movement distance based on target type
  let moveDistance: number;
  if (target.type === 'node') {
    // TODO: FIX NODE ATTACK RANGE POSITIONING - This logic is correct in principle but needs verification
    // For nodes, we want battalion to stop at attack range edge touching node center
    // Current: optimalDistance = range (battalion attack range)
    // This means: battalion_center should be exactly 'range' distance from node_center
    // The battalion attack range edge will then touch the node center
    // This appears correct, but the issue might be in how the final position is calculated
    const optimalDistance = range; // We want to be at our attack range from the node
    if (updatedDistance <= range) {
      // Already in range, don't move
      moveDistance = 0;
    } else {
      // Move to our attack range from the node
      moveDistance = updatedDistance - optimalDistance;
    }
  } else {
    // For enemy battalions, we need to consider both attack ranges
    // Get the enemy battalion's attack range
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
    if (!enemyBattalion) {
      return { moveDistance: 0, directionX: 0, directionY: 0, updatedDistance: 0, rangePosition: currentPos };
    }
    
    const enemyRange = BOT_CATEGORIES[enemyBattalion.type].stats.range * RANGE_MULTIPLIER;
    
    // We want to be at our attack range from the enemy, but not so close that we're in their attack range
    // The optimal position is at our range from them, but we need to ensure we're not overlapping ranges
    const combinedRange = range + enemyRange;
    const optimalDistance = range; // We want to be at our attack range from the enemy
    
    // If the enemy is too close (within our range), we don't need to move
    if (updatedDistance <= range) {
      moveDistance = 0;
    } else {
      // Move to our attack range from the enemy
      moveDistance = updatedDistance - optimalDistance;
    }
  }
  
  // TODO: VERIFY RANGE POSITION CALCULATION - This calculates where battalion should end up
  // The rangePosition should be such that: distance(rangePosition, target.position) = range
  // This means the battalion attack range edge touches the target center
  // Need to verify this calculation is correct for the visual positioning
  const rangePosition = {
    x: currentPos.x + (directionX * moveDistance),
    y: currentPos.y + (directionY * moveDistance)
  };
  
  return { moveDistance, directionX, directionY, updatedDistance, rangePosition };
};

/**
 * Execute battalion movement animation
 */
const executeBattalionMovement = (
  battalion: { position: any; type: string; quantity: number; currentHealth?: number },
  rangePosition: { x: number; y: number },
  moveDistance: number,
  battalionId: string,
  attackIntervals: any,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  onMovementComplete: () => void
): void => {
  cleanupBattalion(battalionId, attackIntervals);

  const speed = BOT_CATEGORIES[battalion.type].stats.speed;
  // Calculate duration based on distance and speed
  const baseDuration = calculateMovementDuration(speed);
  const movementDuration = (moveDistance / 100) * baseDuration; // Scale by distance
  
  Animated.timing(battalion.position, {
    toValue: rangePosition,
    duration: movementDuration,
    useNativeDriver: true
  }).start(({ finished }) => {
    if (!finished) return;
    
    // Check if battalion was destroyed during movement
    if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
      cleanupBattalion(battalionId, attackIntervals);
      return;
    }
    
    onMovementComplete();
  });
};

/**
 * Handle post-movement validation and continuation
 */
const handlePostMovementActions = (
  battalion: { quantity: number; currentHealth?: number; targetNode?: number; remainingPath?: number[]; finalTarget?: number; nodeIndex: number },
  target: { type: string; index: number; position: { x: number; y: number } },
  nodes: { x: number; y: number }[],
  currentPos: { x: number; y: number },
  range: number,
  isUser: boolean,
  battalionId: string,
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  setupAttacks: (battalion: any, target: any, isUser: boolean, battalionId: string, attackIntervals: any, cleanupBattalion: any, nodeRefs: any, nodes: any, findAvailableTargets: any, moveBattalionAlongPath: any, setUserBattalions?: any, setEnemyBattalions?: any, userBattalions?: any[], enemyBattalions?: any[]) => void,
  debugLog: (message: string) => void,
  userBattalions?: any[],
  enemyBattalions?: any[],
  attackIntervals?: any,
  cleanupBattalion?: any,
  nodeRefs?: any,
  setUserBattalions?: any,
  setEnemyBattalions?: any
): void => {
  if (target.type === 'node') {
    const node = nodes[target.index];
    // Only retarget if node is not neutral (captured)
    if (!isNeutral(target.index)) {
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        // Prevent targeting the same node again
        const validTarget = newTargets.find(t => 
          t.type === 'node' ? isNeutral(t.index) : true
        );
        if (validTarget) {
          moveBattalionAlongPath(battalion, validTarget, isUser, userBattalions, enemyBattalions);
        }
      }
      return;
    }
    
    // Check if we have a remaining path to follow
    if (battalion.remainingPath && battalion.remainingPath.length > 0 && battalion.finalTarget !== undefined) {
      const nextNodeIndex = battalion.remainingPath[0];
      const nextNode = nodes[nextNodeIndex];
      
      if (nextNode) {
        debugLog(`[Step 3 Path Following] ${battalionId} - Continuing path: [${battalion.remainingPath.join(' -> ')}] to final target ${battalion.finalTarget}`);
        
        // Update battalion position to the current node
        battalion.nodeIndex = target.index;
        
        // Remove the current node from remaining path
        battalion.remainingPath = battalion.remainingPath.slice(1);
        
        debugLog(`[Step 3 Path Update] ${battalionId} - Updated to node ${target.index}, remaining path: [${battalion.remainingPath.join(' -> ')}]`);
        
        // Move to the next node in the path
        const nextTarget = {
          type: target.type,
          index: nextNodeIndex,
          distance: 0,
          position: { x: nextNode.x, y: nextNode.y }
        };
        
        debugLog(`[Step 3 Movement] ${battalionId} - Moving to next node ${nextNodeIndex} at position (${nextNode.x.toFixed(1)}, ${nextNode.y.toFixed(1)})`);
        
        moveBattalionAlongPath(battalion, nextTarget, isUser, userBattalions, enemyBattalions);
        return;
      }
    }
    
    // If we've reached the final target, clear path data and start attacking
    if (battalion.finalTarget !== undefined && target.index === battalion.finalTarget) {
      battalion.remainingPath = undefined;
      battalion.finalTarget = undefined;
    }
    
    // Continue attacking neutral node
    setupAttacks(battalion, target, isUser, battalionId, attackIntervals, cleanupBattalion, nodeRefs, nodes, findAvailableTargets, moveBattalionAlongPath, setUserBattalions, setEnemyBattalions, userBattalions, enemyBattalions);
  } else if (target.type === 'battalion') {
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
    // Check if target battalion was destroyed
    if (!enemyBattalion || enemyBattalion.quantity <= 0 || (enemyBattalion.currentHealth ?? 0) <= 0) {
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
      }
      return;
    }

    const enemyPos = getAnimatedPosition(enemyBattalion.position);
    const currentDistance = Math.sqrt(
      Math.pow(enemyPos.x - currentPos.x, 2) + 
      Math.pow(enemyPos.y - currentPos.y, 2)
    );
    
    // Check if target is in range
    if (currentDistance <= range) {
      setupAttacks(battalion, target, isUser, battalionId, attackIntervals, cleanupBattalion, nodeRefs, nodes, findAvailableTargets, moveBattalionAlongPath, setUserBattalions, setEnemyBattalions, userBattalions, enemyBattalions);
    } else {
      // Target moved, follow it
      moveBattalionAlongPath(battalion, { ...target, position: enemyPos }, isUser, userBattalions, enemyBattalions);
    }
  }
};

export { calculateMovementDistance, executeBattalionMovement, handlePostMovementActions };

// ============================================================================
// MOVEMENT VALIDATION AND DECISION LOGIC
// ============================================================================

/**
 * Handle movement validation and retargeting logic
 */
const handleMovementValidation = (
  battalion: any,
  target: any,
  nodes: any[],
  currentPos: { x: number; y: number },
  range: number,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  battalionId: string,
  attackIntervals: any,
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  isUser: boolean,
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  userBattalions?: any[],
  enemyBattalions?: any[]
): { shouldContinue: boolean; shouldAttack: boolean } => {
  // Validate battalion and target
  const validation = validateBattalionAndTarget(
    battalion,
    target,
    nodes,
    currentPos,
    range,
    cleanupBattalion,
    battalionId,
    attackIntervals
  );
  
  if (!validation.isValid) {
    if (validation.shouldRetarget) {
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        // Prevent targeting the same node again
        const validTarget = newTargets.find(t => 
          t.type === 'node' ? isNeutral(t.index) : true
        );
        if (validTarget) {
          moveBattalionAlongPath(battalion, validTarget, isUser, userBattalions, enemyBattalions);
        }
      }
    }
    return { shouldContinue: false, shouldAttack: false };
  }
  
  // If in range, start attacking
  if (validation.inRange) {
    return { shouldContinue: false, shouldAttack: true };
  }
  
  return { shouldContinue: true, shouldAttack: false };
};

/**
 * Handle movement decision logic (attack vs move)
 */
const handleMovementDecision = (
  currentPos: { x: number; y: number },
  target: any,
  range: number,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[]
): { shouldAttack: boolean; rangePosition: { x: number; y: number } } => {
  // Calculate movement distance and direction
  const movementResult = calculateMovementDistance(
    currentPos,
    target,
    range,
    isUser,
    userBattalions,
    enemyBattalions
  );
  
  const { updatedDistance, rangePosition } = movementResult;
  
  // If we're already in range but the moveDistance calculation is wrong, start attacking anyway
  if (updatedDistance <= range) {
    return { shouldAttack: true, rangePosition };
  }
  
  return { shouldAttack: false, rangePosition };
};

export { handleMovementValidation, handleMovementDecision };

// ============================================================================
// PATH COORDINATION LOGIC
// ============================================================================

/**
 * Handle path coordination for both node and battalion targets
 */
const handlePathCoordination = (
  battalion: any,
  target: any,
  nodes: any[],
  findShortestPaths: (startNode: number, nodes: any[]) => { distances: { [key: number]: number }; previousNodes: { [key: number]: number | null } },
  reconstructPath: (startNode: number, endNode: number, previousNodes: { [key: number]: number | null }) => number[],
  setupAttacksFromCombat: (battalion: any, target: any, isUser: boolean, battalionId: string, attackIntervals: any, cleanupBattalion: any, nodeRefs: any, nodes: any, findAvailableTargets: any, moveBattalionAlongPath: any, setUserBattalions?: any, setEnemyBattalions?: any, userBattalions?: any[], enemyBattalions?: any[]) => void,
  battalionId: string,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[],
  attackIntervals?: any,
  cleanupBattalion?: any,
  nodeRefs?: any,
  findAvailableTargets?: any,
  moveBattalionAlongPath?: any,
  setUserBattalions?: any,
  setEnemyBattalions?: any,
  checkForInfiniteLoop?: (battalionId: string, action: string) => boolean,
  debugLog?: (message: string) => void
): { shouldContinue: boolean; updatedTarget?: any } => {
  // Only for node targets, try using the calculated path
  if (target.type === 'node') {
    const pathResult = handleNodePathCalculation(
      battalion,
      target,
      nodes,
      findShortestPaths,
      reconstructPath,
      setupAttacksFromCombat,
      battalionId,
      isUser,
      userBattalions,
      enemyBattalions,
      attackIntervals,
      cleanupBattalion,
      nodeRefs,
      findAvailableTargets,
      moveBattalionAlongPath,
      setUserBattalions,
      setEnemyBattalions
    );
    
    if (!pathResult.shouldContinue) {
      return { shouldContinue: false };
    }
    
    return { shouldContinue: true, updatedTarget: pathResult.updatedTarget };
  } else if (target.type === 'battalion') {
    // Handle battalion path following
    const pathFollowingResult = handleBattalionPathFollowing(
      battalion,
      target,
      nodes,
      battalionId,
      checkForInfiniteLoop || (() => false),
      debugLog || (() => {}),
      moveBattalionAlongPath || (() => {}),
      isUser,
      userBattalions,
      enemyBattalions
    );
    
    if (!pathFollowingResult.shouldContinue) {
      return { shouldContinue: false };
    }
    
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
    if (!enemyBattalion) {
      return { shouldContinue: false };
    }
    
    // Setup path following for battalion targets
    setupBattalionPathFollowing(
      battalion,
      target,
      enemyBattalion,
      nodes,
      findShortestPaths,
      reconstructPath,
      battalionId,
      debugLog || (() => {})
    );
  }
  
  return { shouldContinue: true };
};

export { handlePathCoordination };

// ============================================================================
// MOVEMENT EXECUTION COORDINATION
// ============================================================================

/**
 * Handle movement execution coordination
 */
const handleMovementExecution = (
  battalion: any,
  target: any,
  currentPos: { x: number; y: number },
  range: number,
  isUser: boolean,
  battalionId: string,
  attackIntervals: any,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  setupAttacksFromCombat: (battalion: any, target: any, isUser: boolean, battalionId: string, attackIntervals: any, cleanupBattalion: any, nodeRefs: any, nodes: any, findAvailableTargets: any, moveBattalionAlongPath: any, setUserBattalions?: any, setEnemyBattalions?: any, userBattalions?: any[], enemyBattalions?: any[]) => void,
  nodeRefs: any,
  nodes: any,
  findAvailableTargets: any,
  moveBattalionAlongPath: any,
  userBattalions?: any[],
  enemyBattalions?: any[],
  setUserBattalions?: any,
  setEnemyBattalions?: any,
  debugLog?: (message: string) => void
): void => {
  // Handle movement decision logic
  const decisionResult = handleMovementDecision(
    currentPos,
    target,
    range,
    isUser,
    userBattalions,
    enemyBattalions
  );
  
  if (decisionResult.shouldAttack) {
    setupAttacksFromCombat(
      battalion,
      target,
      isUser,
      battalionId,
      attackIntervals,
      cleanupBattalion,
      nodeRefs,
      nodes,
      findAvailableTargets,
      moveBattalionAlongPath,
      setUserBattalions,
      setEnemyBattalions,
      userBattalions,
      enemyBattalions
    );
    return;
  }

  // Execute movement animation
  executeBattalionMovement(
    battalion,
    decisionResult.rangePosition,
    calculateMovementDistance(currentPos, target, range, isUser, userBattalions, enemyBattalions).moveDistance,
    battalionId,
    attackIntervals,
    cleanupBattalion,
    () => {
      // Post-movement actions
      handlePostMovementActions(
        battalion,
        target,
        nodes,
        currentPos,
        range,
        isUser,
        battalionId,
        findAvailableTargets,
        moveBattalionAlongPath,
        setupAttacksFromCombat,
        debugLog || (() => {}),
        userBattalions,
        enemyBattalions,
        attackIntervals,
        cleanupBattalion,
        nodeRefs,
        setUserBattalions,
        setEnemyBattalions
      );
    }
  );
};

export { handleMovementExecution }; 

// ============================================================================
// NETWORK LINE MOVEMENT VALIDATION (Step 3.2)
// ============================================================================

/**
 * Validates that battalion movement follows network lines exactly
 * @param battalionPos Current battalion position
 * @param targetPos Target position
 * @param nodes Array of all nodes
 * @param path Current movement path
 * @returns Validation results with debug info
 */
const validateNetworkLineMovement = (
  battalionPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  nodes: { x: number; y: number }[],
  path: number[]
): { isValid: boolean; nearestLine: [number, number] | null; distance: number; debugInfo: any } => {
  // Validate the path follows network lines
  const pathValidation = validateNetworkLinePath(path);
  
  // Find nearest network line to current position
  const nearestLineInfo = findNearestNetworkLine(battalionPos, nodes);
  
  // Check if battalion is within tolerance of a network line (5 pixels)
  const tolerance = 5;
  const isOnNetworkLine = nearestLineInfo.distance <= tolerance;
  
  const debugInfo = {
    pathValidation,
    nearestLineInfo,
    isOnNetworkLine,
    tolerance,
    battalionPos,
    targetPos
  };

  // Log network line adherence for Step 3.2
  console.log('Network line adherence:', {
    battalionPos,
    nearestLine: nearestLineInfo.nearestLine,
    distance: nearestLineInfo.distance,
    isOnNetworkLine,
    pathValid: pathValidation.isValid
  });

  return {
    isValid: pathValidation.isValid && isOnNetworkLine,
    nearestLine: nearestLineInfo.nearestLine,
    distance: nearestLineInfo.distance,
    debugInfo
  };
};

export { validateNetworkLineMovement };
