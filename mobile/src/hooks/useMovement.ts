import { useCallback } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { calculateMovementDuration } from '../utils/battleUtils';
import { isNeutral } from '../utils/nodeOwnership';
import { validateNetworkLinePath, findNearestNetworkLine } from '../utils/pathfinding';
import { validateBattalionAndTarget } from '../utils/battleUtils';
import { createMovementMonitoring, clearMovementMonitoring } from '../utils/movementMonitoring';

const getAnimatedPosition = (position: Animated.ValueXY) => {
  return {
    x: (position.x as any)._value || 0,
    y: (position.y as any)._value || 0
  };
};

const cleanupBattalion = (battalionId: string, attackIntervals: { [key: string]: NodeJS.Timeout }) => {
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
  
  let moveDistance: number;
  if (target.type === 'node') {
    const optimalDistance = range;
    if (updatedDistance <= range) {
      moveDistance = 0;
    } else {
      moveDistance = updatedDistance - optimalDistance;
    }
  } else {
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
    if (!enemyBattalion) {
      return { moveDistance: 0, directionX: 0, directionY: 0, updatedDistance: 0, rangePosition: currentPos };
    }
    
    const enemyRange = BOT_CATEGORIES[enemyBattalion.type].stats.range * RANGE_MULTIPLIER;
    
    const combinedRange = range + enemyRange;
    const optimalDistance = range;
    
    if (updatedDistance <= range) {
      moveDistance = 0;
    } else {
      moveDistance = updatedDistance - optimalDistance;
    }
  }
  
  const rangePosition = {
    x: currentPos.x + (directionX * moveDistance),
    y: currentPos.y + (directionY * moveDistance)
  };
  
  return { moveDistance, directionX, directionY, updatedDistance, rangePosition };
};

const executeBattalionMovement = (
  battalion: { position: any; type: string; quantity: number; currentHealth?: number },
  rangePosition: { x: number; y: number },
  moveDistance: number,
  battalionId: string,
  attackIntervals: any,
  cleanupBattalion: (battalionId: string, attackIntervals: any) => void,
  onMovementComplete: () => void,
  target?: any,
  isUser?: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[],
  findAvailableTargets?: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath?: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void
): void => {
  cleanupBattalion(battalionId, attackIntervals);

  const speed = BOT_CATEGORIES[battalion.type].stats.speed;
  const baseDuration = calculateMovementDuration(speed);
  const movementDuration = (moveDistance / 100) * baseDuration;
  
  // Step 4.2: Add periodic target monitoring during movement
  let monitoringInterval: NodeJS.Timeout | null = null;
  
  if (target && findAvailableTargets && moveBattalionAlongPath) {
    monitoringInterval = createMovementMonitoring({
      battalionId,
      target,
      isUser: isUser!,
      userBattalions,
      enemyBattalions,
      findAvailableTargets,
      moveBattalionAlongPath,
      battalion
    });
  }
  
  Animated.timing(battalion.position, {
    toValue: rangePosition,
    duration: movementDuration,
    useNativeDriver: true
  }).start(({ finished }) => {
    // Clear monitoring interval when movement completes
    clearMovementMonitoring(monitoringInterval);
    
    if (!finished) return;
    
    if (battalion.quantity <= 0 || (battalion.currentHealth ?? 0) <= 0) {
      cleanupBattalion(battalionId, attackIntervals);
      return;
    }
    
    onMovementComplete();
  });
};

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
    if (!isNeutral(target.index)) {
      battalion.targetNode = undefined;
      const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
      if (newTargets.length > 0) {
        const validTarget = newTargets.find(t => 
          t.type === 'node' ? isNeutral(t.index) : true
        );
        if (validTarget) {
          moveBattalionAlongPath(battalion, validTarget, isUser, userBattalions, enemyBattalions);
        }
      }
      return;
    }
    
    if (battalion.remainingPath && battalion.remainingPath.length > 0 && battalion.finalTarget !== undefined) {
      const nextNodeIndex = battalion.remainingPath[0];
      const nextNode = nodes[nextNodeIndex];
      
      if (nextNode) {
        debugLog(`[Step 3 Path Following] ${battalionId} - Continuing path: [${battalion.remainingPath.join(' -> ')}] to final target ${battalion.finalTarget}`);
        
        battalion.nodeIndex = target.index;
        
        battalion.remainingPath = battalion.remainingPath.slice(1);
        
        debugLog(`[Step 3 Path Update] ${battalionId} - Updated to node ${target.index}, remaining path: [${battalion.remainingPath.join(' -> ')}]`);
        
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
    
    if (battalion.finalTarget !== undefined && target.index === battalion.finalTarget) {
      battalion.remainingPath = undefined;
      battalion.finalTarget = undefined;
    }
    
    setupAttacks(battalion, target, isUser, battalionId, attackIntervals, cleanupBattalion, nodeRefs, nodes, findAvailableTargets, moveBattalionAlongPath, setUserBattalions, setEnemyBattalions, userBattalions, enemyBattalions);
  } else if (target.type === 'battalion') {
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    const enemyBattalion = enemyBatts?.[target.index];
    
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
    
    if (currentDistance <= range) {
      setupAttacks(battalion, target, isUser, battalionId, attackIntervals, cleanupBattalion, nodeRefs, nodes, findAvailableTargets, moveBattalionAlongPath, setUserBattalions, setEnemyBattalions, userBattalions, enemyBattalions);
    } else {
      moveBattalionAlongPath(battalion, { ...target, position: enemyPos }, isUser, userBattalions, enemyBattalions);
    }
  }
};

export { calculateMovementDistance, executeBattalionMovement, handlePostMovementActions };

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
  
  if (validation.inRange) {
    return { shouldContinue: false, shouldAttack: true };
  }
  
  return { shouldContinue: true, shouldAttack: false };
};

const handleMovementDecision = (
  currentPos: { x: number; y: number },
  target: any,
  range: number,
  isUser: boolean,
  userBattalions?: any[],
  enemyBattalions?: any[]
): { shouldAttack: boolean; rangePosition: { x: number; y: number } } => {
  const movementResult = calculateMovementDistance(
    currentPos,
    target,
    range,
    isUser,
    userBattalions,
    enemyBattalions
  );
  
  const { updatedDistance, rangePosition } = movementResult;
  
  if (updatedDistance <= range) {
    return { shouldAttack: true, rangePosition };
  }
  
  return { shouldAttack: false, rangePosition };
};

export { handleMovementValidation, handleMovementDecision };

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

  executeBattalionMovement(
    battalion,
    decisionResult.rangePosition,
    calculateMovementDistance(currentPos, target, range, isUser, userBattalions, enemyBattalions).moveDistance,
    battalionId,
    attackIntervals,
    cleanupBattalion,
    () => {
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
    },
    target,
    isUser,
    userBattalions,
    enemyBattalions,
    findAvailableTargets,
    moveBattalionAlongPath
  );
};

export { handleMovementExecution }; 

const validateNetworkLineMovement = (
  battalionPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  nodes: { x: number; y: number }[],
  path: number[]
): { isValid: boolean; nearestLine: [number, number] | null; distance: number; debugInfo: any } => {
  const pathValidation = validateNetworkLinePath(path);
  
  const nearestLineInfo = findNearestNetworkLine(battalionPos, nodes);
  
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
