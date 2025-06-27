import React, { useCallback, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { checkRangeIntersection } from '../utils/battleCalculator';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { findShortestPaths, reconstructPath } from '../utils/pathfinding';
import { getConnectedNodes } from '../utils/networkConstants';
import { useBattalionRefsAndState, type BattalionRefs, type AttackIntervals, type NodeRefs, findBattalionIndexAndId } from './useBattalionRefsAndState';
import { 
  handleBattalionDamage, 
  setupAttacks,
  createBattalionKey,
  performBattalionAttack,
  setupBattalionAttacks
} from './useCombat';
import { 
  checkForInfiniteLoop, 
  getAnimatedPosition, 
  cleanupBattalion, 
  validateBattalionAndTarget,
  handleNodePathCalculation,
  handleBattalionPathFollowing,
  setupBattalionPathFollowing,
  calculateMovementDistance,
  executeBattalionMovement,
  handlePostMovementActions,
  handleMovementValidation,
  handleMovementDecision,
  handlePathCoordination,
  handleMovementExecution
} from './useMovement';
import { useTargeting } from './useTargeting';
import { useBattleEngine } from './useBattleEngine';
import { calculateTotalDamage, calculateMovementDuration } from '../utils/battleUtils';

// Constants
const ATTACK_DELAY = 300;
const CAPTURE_MEMORY_DURATION = 5000;

// Helper functions
// const createBattalionKey = (isUser: boolean, nodeIndex: number) => 
//   `${isUser ? 'user' : 'enemy'}-${nodeIndex}`;

// Debug flag and logging
const DEBUG_BATTLE = true;
const debugLog = (message: string) => {
  if (DEBUG_BATTLE) {
    console.log(message);
  }
};

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
    const range = BOT_CATEGORIES[battalion.type].stats.range * RANGE_MULTIPLIER;
    
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
  const { findAvailableTargets, findNewTarget } = useTargeting(
    nodes,
    retargetCooldowns,
    recentlyCapturedNodes,
    battalionsRef,
    findBattalionIndexAndId,
    moveBattalionAlongPath
  );

  // Update the ref with the real function
  useEffect(() => {
    findAvailableTargetsRef.current = findAvailableTargets;
  }, [findAvailableTargets]);

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

  // Wrapper for setupBattalionAttacks that provides the correct parameters
  const setupBattalionAttacksWrapper = (
    battalion: BattalionPosition,
    targetBattalion: BattalionPosition,
    isUser: boolean
  ) => {
    setupBattalionAttacks(
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
    );
  };

  // Node capture handling with retargeting
  const handleNodeCapture = useCallback((nodeIndex: number, newControlState: 'user' | 'enemy') => {
    // Update node control state
    nodesRef.current[nodeIndex].controlState = newControlState;
    
    // Mark as recently captured to prevent immediate retargeting
    recentlyCapturedNodes.current.add(nodeIndex);
    setTimeout(() => {
      recentlyCapturedNodes.current.delete(nodeIndex);
    }, CAPTURE_MEMORY_DURATION);
    
    // Retarget all battalions
    retargetAllBattalions();
  }, []);

  // Retarget all battalions after node capture
  const retargetAllBattalions = useCallback(() => {
    // Retarget user battalions
    battalionsRef.current.user.forEach((battalion, index) => {
      if (battalion && battalion.quantity > 0 && battalion.currentHealth > 0) {
        findNewTarget(battalion, true);
      }
    });
    
    // Retarget enemy battalions
    battalionsRef.current.enemy.forEach((battalion, index) => {
      if (battalion && battalion.quantity > 0 && battalion.currentHealth > 0) {
        findNewTarget(battalion, false);
      }
    });
  }, []);

  return {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
    setupBattalionAttacks: setupBattalionAttacksWrapper,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath,
    handleNodeCapture
  };
}; 