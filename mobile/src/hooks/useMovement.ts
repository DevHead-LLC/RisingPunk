import { useCallback } from 'react';
import { Animated } from 'react-native';

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
  setupAttacks: (battalion: any, target: any, isUser: boolean, battalionId: string, userBattalions?: any[], enemyBattalions?: any[]) => void,
  battalionId: string,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[]
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
    setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
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