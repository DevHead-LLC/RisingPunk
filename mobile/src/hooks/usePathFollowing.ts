import { isNeutral } from '../utils/nodeOwnership';
import { findOptimalBattalionPath, validateBattalionPath } from '../utils/pathfinding';

export const handleNodePathCalculation = (
  battalion: { nodeIndex: number; remainingPath?: number[]; finalTarget?: number },
  target: { type: string; index: number; position: { x: number; y: number } },
  nodes: { x: number; y: number }[],
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
  // Allow pathfinding through any node; only block attack/capture at the end
  const { distances, previousNodes } = findShortestPaths(battalion.nodeIndex, nodes);
  const path = reconstructPath(battalion.nodeIndex, target.index, previousNodes);
  
  // Validate that we have a valid path before allowing any movement
  if (path.length === 0) {
    return { shouldContinue: false };
  }
  
  // Only check isNeutral for node targets
  if (target.type === 'node' && path.length === 1) {
    if (!isNeutral(target.index)) {
      return { shouldContinue: false };
    }
  }
  
  if (path.length === 1) {
    // At the target node, check if we can attack/capture
    if (target.type === 'node' && !isNeutral(target.index)) {
      return { shouldContinue: false };
    }
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

export const handleBattalionPathFollowing = (
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
      // Enhanced infinite loop detection
      const loopCheck = checkForInfiniteLoop(battalionId, 'battalion-path-following');
      const oscillationCheck = battalion.remainingPath.length > 10; // If path is too long, likely oscillating
      
      if (loopCheck || oscillationCheck) {
        // Clear path data to break the loop
        battalion.remainingPath = undefined;
        battalion.finalTarget = undefined;
        return { shouldContinue: false };
      }
      
      const progress = battalion.remainingPath.length;
      const totalPath = [battalion.nodeIndex, ...battalion.remainingPath];
      

      
      // Update battalion position to the current node
      battalion.nodeIndex = target.index;
      
      // Remove the current node from remaining path
      battalion.remainingPath = battalion.remainingPath.slice(1);
      
      // Move to the next node in the path
      const nextTarget = {
        type: target.type,
        index: nextNodeIndex,
        distance: 0,
        position: { x: nextNode.x, y: nextNode.y }
      };
      
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

export const setupBattalionPathFollowing = (
  battalion: { nodeIndex: number; remainingPath?: number[]; finalTarget?: number },
  target: { type: string; index: number },
  enemyBattalion: { nodeIndex: number },
  nodes: { x: number; y: number }[],
  findShortestPaths: (startNode: number, nodes: any[]) => { distances: { [key: number]: number }; previousNodes: { [key: number]: number | null } },
  reconstructPath: (startNode: number, endNode: number, previousNodes: { [key: number]: number | null }) => number[],
  battalionId: string,
  debugLog: (message: string) => void
): void => {
  // Calculate path to enemy battalion's node position using enhanced pathfinding
  const targetNodeIndex = enemyBattalion.nodeIndex;
  
  // Use the new optimal pathfinding for battalion-to-battalion targeting
  const pathResult = findOptimalBattalionPath(battalion.nodeIndex, targetNodeIndex, nodes);
  const battalionPath = pathResult.path;
  
  // Validate the path follows network topology
  const validation = validateBattalionPath(battalionPath, battalion.nodeIndex, targetNodeIndex);
  

  
  // Check for potential oscillation in the path
  const hasOscillation = battalionPath.length > 2 && battalionPath.some((node, index) => {
    if (index < battalionPath.length - 1) {
      return battalionPath.indexOf(node, index + 1) !== -1;
    }
    return false;
  });
  
  if (hasOscillation) {
    battalion.remainingPath = [];
    battalion.finalTarget = targetNodeIndex;
    return;
  }
  
  // Set path following data for battalion targets with enhanced pathfinding
  if (battalionPath.length >= 2) {
    const nextNodeIndex = battalionPath[1];
    const nextNode = nodes[nextNodeIndex];
    if (nextNode) {
      // Store the remaining path for continuation
      battalion.remainingPath = battalionPath.slice(1);
      battalion.finalTarget = targetNodeIndex;
      

    }
  } else if (battalionPath.length === 1) {
    // Direct path to target node
    battalion.remainingPath = [];
    battalion.finalTarget = targetNodeIndex;
  } else {
  }
};

export const handlePathCoordination = (
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