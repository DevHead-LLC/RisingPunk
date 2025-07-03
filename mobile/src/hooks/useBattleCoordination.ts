import React, { useCallback, useEffect } from 'react';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { getBotStats } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { findShortestPaths, reconstructPath } from '../utils/pathfinding';
import { useBattalionRefsAndState, findBattalionIndexAndId } from './useBattalionRefsAndState';
import { 
  setupAttacks,
  createSetupBattalionAttacksWrapperHook
} from './useCombat';
import {
  getAnimatedPosition, 
  cleanupBattalion, 
  handleMovementValidation,
  handleMovementExecution
} from './useMovement';
import { useTargeting } from './useTargeting';
import { useBattleEngine } from './useBattleEngine';
import { handlePathCoordination } from './usePathFollowing';

// Infinite loop detection
const loopDetection = new Map<string, { count: number, lastTime: number }>();
const checkForInfiniteLoop = (battalionId: string, action: string) => {
  const key = `${battalionId}-${action}`;
  const now = Date.now();
  const record = loopDetection.get(key);
  
  if (record && now - record.lastTime < 1000) {
    record.count++;
    if (record.count > 10) {
      return true;
    }
  } else {
    loopDetection.set(key, { count: 1, lastTime: now });
  }
  return false;
};

export const useBattleCoordination = (
  battleStarted: boolean,
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[],
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  onBattalionLoss: (type: string, name: string, quantity: number, mark?: number) => void
) => {
  // Use the centralized refs and state management
  const {
    battalionRefs,
    attackIntervals,
    nodeRefs,
    battleInitializedRef,
    battalionsRef,
    nodesRef,
    retargetCooldowns,
    recentlyCapturedNodes,
    findAvailableTargetsRef,
    ATTACK_DELAY,
    CAPTURE_MEMORY_DURATION
  } = useBattalionRefsAndState(nodes, userBattalions, enemyBattalions);

  const moveBattalionAlongPath = useCallback((
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ): void => {
    // Generate battalion ID
    const { battalionId } = findBattalionIndexAndId(battalion, isUser, userBattalions || [], enemyBattalions || []);
    
    // Get current position and range for validation
    const currentPos = getAnimatedPosition(battalion.position);
    const range = getBotStats(battalion.type, isUser).stats.range * RANGE_MULTIPLIER;
    
    // Handle movement validation and retargeting
    const validationResult = handleMovementValidation(
      battalion,
      target,
      nodes,
      currentPos,
      range,
      cleanupBattalion,
      battalionId,
      attackIntervals.current,
      findAvailableTargetsRef.current,
      isUser,
      moveBattalionAlongPath,
      userBattalions,
      enemyBattalions
    );
    
    if (!validationResult.shouldContinue) {
      if (validationResult.shouldAttack) {
        setupAttacks(
          battalion,
          target,
          isUser,
          battalionId,
          attackIntervals.current,
          cleanupBattalion,
          nodeRefs.current,
          nodes,
          findAvailableTargetsRef.current,
          moveBattalionAlongPath,
          setUserBattalions,
          setEnemyBattalions,
          userBattalions,
          enemyBattalions
        );
      }
      return;
    }
    
    // Handle path coordination
    const pathResult = handlePathCoordination(
      battalion,
      target,
      nodes,
      findShortestPaths,
      reconstructPath,
      setupAttacks,
      battalionId,
      isUser,
      userBattalions,
      enemyBattalions,
      attackIntervals.current,
      cleanupBattalion,
      nodeRefs.current,
      findAvailableTargetsRef.current,
      moveBattalionAlongPath,
      setUserBattalions,
      setEnemyBattalions,
      checkForInfiniteLoop,
      () => {}
    );
    
    if (!pathResult.shouldContinue) {
      return;
    }
    
    if (pathResult.updatedTarget) {
      target.position = pathResult.updatedTarget.position;
    }
    
    // Handle movement execution
    handleMovementExecution(
      battalion,
      target,
      currentPos,
      range,
      isUser,
      battalionId,
      attackIntervals.current,
      cleanupBattalion,
      setupAttacks,
      nodeRefs.current,
      nodes,
      findAvailableTargetsRef.current,
      moveBattalionAlongPath,
      userBattalions,
      enemyBattalions,
      setUserBattalions,
      setEnemyBattalions,
      () => {}
    );
  }, [nodes, attackIntervals, findAvailableTargetsRef, nodeRefs, setUserBattalions, setEnemyBattalions]);

  // Use targeting hook (after moveBattalionAlongPath is defined)
  const { findAvailableTargets, findNewTarget, retargetAllBattalions } = useTargeting(
    nodes,
    retargetCooldowns,
    recentlyCapturedNodes,
    battalionsRef,
    findBattalionIndexAndId,
    moveBattalionAlongPath
  );

  // Update the ref with the real function
  useEffect(() => {
    if (findAvailableTargets) {
      findAvailableTargetsRef.current = findAvailableTargets;
    }
  }, [findAvailableTargets, findAvailableTargetsRef]);

  // Use battle engine for memoized calculations
  const { memoizedCalculations } = useBattleEngine(
    battleStarted,
    battalionRefs,
    attackIntervals,
    nodeRefs,
    battleInitializedRef,
    battalionsRef,
    nodesRef,
    findAvailableTargets,
    moveBattalionAlongPath
  );

  // Create the setupBattalionAttacks wrapper function
  const setupBattalionAttacks = createSetupBattalionAttacksWrapperHook(
    attackIntervals.current,
    battalionRefs.current,
    setUserBattalions,
    setEnemyBattalions,
    onBattalionLoss,
    memoizedCalculations,
    findAvailableTargets,
    moveBattalionAlongPath,
    battalionsRef,
    ATTACK_DELAY
  );

  return {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
    setupBattalionAttacks,
    findAvailableTargets,
    moveBattalionAlongPath
  };
}; 