import { useCallback } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { calculateMovementDuration } from '../utils/battleUtils';

// Infinite loop detection
const loopDetection = new Map<string, { count: number, lastTime: number }>();
const checkForInfiniteLoop = (battalionId: string, action: string) => {
  const key = `${battalionId}-${action}`;
  const now = Date.now();
  const record = loopDetection.get(key);
  
  if (record && now - record.lastTime < 1000) {
    record.count++;
    if (record.count > 10) {
      console.log(`[INFINITE LOOP DETECTED] ${battalionId} - ${action} repeated ${record.count} times`);
      return true;
    }
  } else {
    loopDetection.set(key, { count: 1, lastTime: now });
  }
  return false;
};

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

export { checkForInfiniteLoop, getAnimatedPosition, cleanupBattalion };

// ============================================================================
// TARGET VALIDATION LOGIC
// ============================================================================

/**
 * Validate if a battalion can move and if the target is valid
 */
const validateBattalionAndTarget = (
  battalion: { quantity: number; currentHealth?: number; targetNode?: number },
  target: { type: string; index: number; position?: { x: number; y: number } },
  nodes: { controlState: string }[],
  currentPos: { x: number; y: number },
  range: number,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  battalionId: string,
  attackIntervals: any
): { isValid: boolean; shouldRetarget: boolean; distance: number; inRange: boolean } => {
  // Check if battalion is destroyed
  if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
    cleanupBattalion(battalionId, attackIntervals);
    return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
  }

  // Validate node target before proceeding
  if (target.type === 'node') {
    const node = nodes[target.index];
    // Only retarget if node is not neutral (captured)
    if (node.controlState !== 'neutral') {
      battalion.targetNode = undefined;
      return { isValid: false, shouldRetarget: true, distance: 0, inRange: false };
    }
  }

  if (!target || !target.position) {
    return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
  }
  
  // Check target validity before any movement or path calculation
  if (target.type === 'node') {
    const targetNode = nodes[target.index];
    if (targetNode.controlState !== 'neutral') {
      return { isValid: false, shouldRetarget: false, distance: 0, inRange: false };
    }
  }
  
  // Check if battalion is already in attack range before any movement calculations
  const dx = target.position.x - currentPos.x;
  const dy = target.position.y - currentPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const inRange = distance <= range;
  
  // If in range, battalion is valid for attacking but not for moving
  if (inRange) {
    return { isValid: true, shouldRetarget: false, distance, inRange: true };
  }

  return { isValid: true, shouldRetarget: false, distance, inRange: false };
};

export { validateBattalionAndTarget };

// ============================================================================
// PATH CALCULATION AND FOLLOWING LOGIC
// ============================================================================

/**
 * Calculate and handle path following for node targets
 */
const handleNodePathCalculation = (
  battalion: { nodeIndex: number; remainingPath?: number[]; finalTarget?: number },
  target: { type: string; index: number; position: { x: number; y: number } },
  nodes: { x: number; y: number; controlState: string }[],
  findShortestPaths: (startNode: number, nodes: any[]) => { distances: { [key: number]: number }; previousNodes: { [key: number]: number | null } },
  reconstructPath: (startNode: number, endNode: number, previousNodes: { [key: number]: number | null }) => number[],
  setupAttacks: (battalion: any, target: any, isUser: boolean, battalionId: string, attackIntervals: any, cleanupBattalion: any, nodeRefs: any, nodes: any, findAvailableTargets: any, moveBattalionAlongPath: any, setUserBattalions?: any, setEnemyBattalions?: any, userBattalions?: any[], enemyBattalions?: any[]) => void,
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
  setEnemyBattalions?: any
): { shouldContinue: boolean; updatedTarget?: { type: string; index: number; position: { x: number; y: number } } } => {
  const targetNode = nodes[target.index];
  if (targetNode.controlState !== 'neutral') {
    return { shouldContinue: false };
  }
  
  const { distances, previousNodes } = findShortestPaths(battalion.nodeIndex, nodes);
  const path = reconstructPath(battalion.nodeIndex, target.index, previousNodes);
  
  // Validate that we have a valid path before allowing any movement
  if (path.length === 0) {
    return { shouldContinue: false };
  }
  
  if (path.length === 1) {
    setupAttacks(battalion, target, isUser, battalionId, attackIntervals, cleanupBattalion, nodeRefs, nodes, findAvailableTargets, moveBattalionAlongPath, setUserBattalions, setEnemyBattalions, userBattalions, enemyBattalions);
    return { shouldContinue: false };
  }
  
  // If we have a valid path with more than 1 step, use the first step
  if (path.length >= 2) {
    const nextNodeIndex = path[1];
    const nextNode = nodes[nextNodeIndex];
    if (nextNode) {
      // Use the next node's position instead of target position
      const updatedTarget = { ...target, position: { x: nextNode.x, y: nextNode.y } };
      
      // Store the remaining path for continuation
      battalion.remainingPath = path.slice(1);
      battalion.finalTarget = target.index;
      
      return { shouldContinue: true, updatedTarget };
    }
  }
  
  return { shouldContinue: false };
};

/**
 * Handle battalion path following logic
 */
const handleBattalionPathFollowing = (
  battalion: { nodeIndex: number; remainingPath?: number[]; finalTarget?: number },
  target: { type: string; index: number },
  nodes: { x: number; y: number }[],
  battalionId: string,
  checkForInfiniteLoop: (battalionId: string, action: string) => boolean,
  debugLog: (message: string) => void,
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[]
): { shouldContinue: boolean; nextTarget?: { type: string; index: number; position: { x: number; y: number } } } => {
  // Check if we have a remaining path to follow (same as node targets)
  if (battalion.remainingPath && battalion.remainingPath.length > 0 && battalion.finalTarget !== undefined) {
    const nextNodeIndex = battalion.remainingPath[0];
    const nextNode = nodes[nextNodeIndex];
    
    if (nextNode) {
      // Check for infinite loop
      if (checkForInfiniteLoop(battalionId, 'battalion-path-following')) {
        // Clear path data to break the loop
        battalion.remainingPath = undefined;
        battalion.finalTarget = undefined;
        console.log(`[LOOP BREAK] ${battalionId} - Cleared path data to break infinite loop`);
        return { shouldContinue: false };
      }
      
      debugLog(`[Step 3 Battalion Path Following] ${battalionId} - Continuing path: [${battalion.remainingPath.join(' -> ')}] to final target ${battalion.finalTarget}`);
      
      // Update battalion position to the current node
      battalion.nodeIndex = target.index;
      
      // Remove the current node from remaining path
      battalion.remainingPath = battalion.remainingPath.slice(1);
      
      debugLog(`[Step 3 Battalion Path Update] ${battalionId} - Updated to node ${target.index}, remaining path: [${battalion.remainingPath.join(' -> ')}]`);
      
      // Move to the next node in the path
      const nextTarget = {
        type: 'node' as const,
        index: nextNodeIndex,
        distance: 0,
        position: { x: nextNode.x, y: nextNode.y }
      };
      
      debugLog(`[Step 3 Battalion Movement] ${battalionId} - Moving to next node ${nextNodeIndex} at position (${nextNode.x.toFixed(1)}, ${nextNode.y.toFixed(1)})`);
      
      moveBattalionAlongPath(battalion, nextTarget, isUser, userBattalions, enemyBattalions);
      return { shouldContinue: false };
    }
  }
  
  // If we've reached the final target, clear path data
  if (battalion.finalTarget !== undefined && target.index === battalion.finalTarget) {
    battalion.remainingPath = undefined;
    battalion.finalTarget = undefined;
  }
  
  return { shouldContinue: true };
};

/**
 * Setup path following for battalion targets
 */
const setupBattalionPathFollowing = (
  battalion: { nodeIndex: number; remainingPath?: number[]; finalTarget?: number },
  target: { type: string; index: number },
  enemyBattalion: { nodeIndex: number },
  nodes: { x: number; y: number }[],
  findShortestPaths: (startNode: number, nodes: any[]) => { distances: { [key: number]: number }; previousNodes: { [key: number]: number | null } },
  reconstructPath: (startNode: number, endNode: number, previousNodes: { [key: number]: number | null }) => number[],
  battalionId: string,
  debugLog: (message: string) => void
): void => {
  // Calculate path to enemy battalion's node position
  const targetNodeIndex = enemyBattalion.nodeIndex;
  
  const { distances, previousNodes } = findShortestPaths(battalion.nodeIndex, nodes);
  const battalionPath = reconstructPath(battalion.nodeIndex, targetNodeIndex, previousNodes);
  
  debugLog(`[Step 3 Battalion Debug] ${battalionId} - Battalion targeting: path=[${battalionPath.join(' -> ')}], targetNode=${targetNodeIndex}`);
  
  // Set path following data for battalion targets (same as node targets)
  if (battalionPath.length >= 2) {
    const nextNodeIndex = battalionPath[1];
    const nextNode = nodes[nextNodeIndex];
    if (nextNode) {
      // Store the remaining path for continuation
      battalion.remainingPath = battalionPath.slice(1);
      battalion.finalTarget = targetNodeIndex;
      
      debugLog(`[Step 3 Battalion Path Set] ${battalionId} - Set remainingPath=[${battalion.remainingPath.join(' -> ')}], finalTarget=${battalion.finalTarget}`);
    }
  }
};

export { handleNodePathCalculation, handleBattalionPathFollowing, setupBattalionPathFollowing };

// ============================================================================
// MOVEMENT CALCULATION AND ANIMATION LOGIC
// ============================================================================

/**
 * Calculate movement distance and direction
 */
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
    // For nodes, move to attack range, not to the center
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
  nodes: { controlState: string; x: number; y: number }[],
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
    if (node.controlState !== 'neutral') {
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        // Prevent targeting the same node again
        const validTarget = newTargets.find(t => 
          t.type === 'node' ? nodes[t.index].controlState === 'neutral' : true
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
          type: 'node' as const,
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
          t.type === 'node' ? nodes[t.index].controlState === 'neutral' : true
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