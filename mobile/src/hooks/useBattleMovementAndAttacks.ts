import React, { useCallback } from 'react';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { getBotStats } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { findShortestPaths, reconstructPath } from '../utils/pathfinding';
import { useBattalionRefsAndState, findBattalionIndexAndId, updateFindAvailableTargetsRef } from './useBattalionRefsAndState';
import { 
  setupAttacks,
  setupBattalionAttacksWrapper
} from './useCombat';
import { 
  checkForInfiniteLoop, 
  getAnimatedPosition, 
  cleanupBattalion, 
  handleMovementValidation,
  handlePathCoordination,
  handleMovementExecution
} from './useMovement';
import { useTargeting } from './useTargeting';
import { useBattleEngine } from './useBattleEngine';

export const useBattleMovementAndAttacks = (
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
    CAPTURE_MEMORY_DURATION,
    debugLog
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
      debugLog
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
      debugLog
    );
  }, [nodes]);

  // Use targeting hook (after moveBattalionAlongPath is defined)
  const { findAvailableTargets, findNewTarget, handleNodeCapture, retargetAllBattalions } = useTargeting(
    nodes,
    retargetCooldowns,
    recentlyCapturedNodes,
    battalionsRef,
    findBattalionIndexAndId,
    moveBattalionAlongPath
  );

  // Update the ref with the real function
  updateFindAvailableTargetsRef(findAvailableTargetsRef, findAvailableTargets);

  // Use battle engine for memoized calculations
  const { memoizedCalculations } = useBattleEngine(
    battleStarted,
    nodes,
    userBattalions,
    enemyBattalions,
    setUserBattalions,
    setEnemyBattalions,
    onBattalionLoss,
    battalionRefs,
    attackIntervals,
    nodeRefs,
    battleInitializedRef,
    battalionsRef,
    nodesRef,
    findAvailableTargets,
    moveBattalionAlongPath
  );

  return {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
    setupBattalionAttacks: (battalion: BattalionPosition, targetBattalion: BattalionPosition, isUser: boolean) => 
      setupBattalionAttacksWrapper(
        battalion,
        targetBattalion,
        isUser,
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
      ),
    findAvailableTargets,
    moveBattalionAlongPath,
    handleNodeCapture: (nodeIndex: number, newControlState: 'user' | 'enemy') => 
      handleNodeCapture(nodeIndex, newControlState, nodesRef, CAPTURE_MEMORY_DURATION)
  };
}; 