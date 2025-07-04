import { useCallback } from 'react';
import { Animated } from 'react-native';
import { RANGE_MULTIPLIER, BOT_CATEGORIES } from '../utils/battleConstants';
import { isNeutral } from '../utils/nodeOwnership';
import { validateNetworkLinePath, findNearestNetworkLine } from '../utils/pathfinding';
import { validateBattalionAndTarget } from '../utils/battleUtils';
import { validateAndRetarget, isInRange } from '../utils/targetValidation';
import { setupAttackIfInRange } from '../utils/attackSetup';
import { continuePathIfNeeded } from '../utils/pathFollowing';
import { executeMovementWithCleanup } from '../utils/movementWrapper';

const getAnimatedPosition = (position: Animated.ValueXY) => {
  return {
    x: (position.x as any)._value || 0,
    y: (position.y as any)._value || 0
  };
};

const cleanupBattalion = (battalionId: string, attackIntervals: { [key: string]: NodeJS.Timeout }) => {
  if (!attackIntervals) return;
  
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
    
    const enemyRange = BOT_CATEGORIES?.[enemyBattalion.type]?.stats?.range * RANGE_MULTIPLIER || 0;
    
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
  executeMovementWithCleanup(
    battalion,
    rangePosition,
    moveDistance,
    battalionId,
    attackIntervals,
    cleanupBattalion,
    onMovementComplete,
    target,
    isUser,
    userBattalions,
    enemyBattalions,
    findAvailableTargets,
    moveBattalionAlongPath
  ).catch((error) => {
    // Silenced: Battalion death or movement interruption is expected and not an error
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
    const validation = validateAndRetarget(
      battalion,
      target,
      nodes,
      currentPos,
      range,
      isUser,
      userBattalions || [],
      enemyBattalions || [],
      findAvailableTargets,
      moveBattalionAlongPath,
      cleanupBattalion || (() => {}),
      battalionId,
      attackIntervals || {}
    );
    
    if (!validation.isValid) {
      return;
    }
    
    const pathResult = continuePathIfNeeded(
      battalion,
      target,
      nodes,
      moveBattalionAlongPath,
      isUser,
      userBattalions || [],
      enemyBattalions || [],
      debugLog,
      battalionId
    );
    
    // If path was continued, don't proceed with attack setup
    if (pathResult.pathContinued) {
      return;
    }
    
    setupAttackIfInRange(
      battalion,
      target,
      currentPos,
      range,
      isUser,
      userBattalions || [],
      enemyBattalions || [],
      setupAttacks,
      moveBattalionAlongPath,
      battalionId,
      attackIntervals || {},
      cleanupBattalion || (() => {}),
      nodeRefs,
      nodes,
      findAvailableTargets,
      setUserBattalions,
      setEnemyBattalions
    );
  } else if (target.type === 'battalion') {
    const validation = validateAndRetarget(
      battalion,
      target,
      nodes,
      currentPos,
      range,
      isUser,
      userBattalions || [],
      enemyBattalions || [],
      findAvailableTargets,
      moveBattalionAlongPath,
      cleanupBattalion || (() => {}),
      battalionId,
      attackIntervals || {}
    );
    
    if (!validation.isValid) {
      return;
    }
    
    setupAttackIfInRange(
      battalion,
      target,
      currentPos,
      range,
      isUser,
      userBattalions || [],
      enemyBattalions || [],
      setupAttacks,
      moveBattalionAlongPath,
      battalionId,
      attackIntervals || {},
      cleanupBattalion || (() => {}),
      nodeRefs,
      nodes,
      findAvailableTargets,
      setUserBattalions,
      setEnemyBattalions
    );
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
  const validation = validateAndRetarget(
    battalion,
    target,
    nodes,
    currentPos,
    range,
    isUser,
    userBattalions || [],
    enemyBattalions || [],
    findAvailableTargets,
    moveBattalionAlongPath,
    cleanupBattalion,
    battalionId,
    attackIntervals
  );
  
  if (!validation.isValid) {
    return { shouldContinue: false, shouldAttack: false };
  }
  
  // Check if battalion is in range
  if (isInRange(currentPos, target, range, isUser, userBattalions || [], enemyBattalions || [])) {
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
): {
  shouldAttack: boolean;
  moveDistance: number;
  directionX: number;
  directionY: number;
  updatedDistance: number;
  rangePosition: { x: number; y: number };
} => {
  const movementResult = calculateMovementDistance(
    currentPos,
    target,
    range,
    isUser,
    userBattalions,
    enemyBattalions
  );

  const { updatedDistance, rangePosition, moveDistance, directionX, directionY } = movementResult;

  return {
    shouldAttack: updatedDistance <= range,
    moveDistance,
    directionX,
    directionY,
    updatedDistance,
    rangePosition
  };
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
    decisionResult.moveDistance,
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