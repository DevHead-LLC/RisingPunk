import React, { useCallback, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { checkRangeIntersection } from '../utils/battleCalculator';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { RANGE_MULTIPLIER } from '../utils/battleConstants';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { findShortestPaths, reconstructPath } from '../utils/pathfinding';
import { getConnectedNodes } from '../utils/networkConstants';
import { findBattalionIndexAndId, type BattalionRefs, type AttackIntervals, type NodeRefs, type OnBattalionLoss } from './useBattalionRefsAndState';
import { 
  setupAttacks as setupAttacksFromCombat,
  handleBattalionDamage as handleBattalionDamageFromCombat
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
const createBattalionKey = (isUser: boolean, nodeIndex: number) => 
  `${isUser ? 'user' : 'enemy'}-${nodeIndex}`;

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
  // IMPORTANT: Keep refs for animations and intervals
  const battalionRefs = useRef<BattalionRefs>({});
  const attackIntervals = useRef<AttackIntervals>({});
  const nodeRefs = useRef<NodeRefs>({});
  const battleInitializedRef = useRef(false);
  const battalionsRef = useRef({ user: userBattalions, enemy: enemyBattalions });
  const nodesRef = useRef(nodes);

  // Add retargeting cooldown tracking
  const retargetCooldowns = useRef<{[key: string]: number}>({});
  const recentlyCapturedNodes = useRef<Set<number>>(new Set());

  // Ref to store the real findAvailableTargets function
  const findAvailableTargetsRef = useRef<(
    battalion: BattalionPosition,
    isUser: boolean,
    userBattalions: BattalionPosition[],
    enemyBattalions: BattalionPosition[]
  ) => any[]>(() => []);

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
        setupAttacksFromCombat(
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
      setupAttacksFromCombat,
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
      setupAttacksFromCombat,
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

  // Update refs when battalions change
  useEffect(() => {
    battalionsRef.current = { user: userBattalions, enemy: enemyBattalions };
  }, [userBattalions, enemyBattalions]);

  // Update nodes ref when nodes change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const handleBattalionDamage = (
    battalion: BattalionPosition,
    damage: number,
    isUser: boolean
  ) => {
    const healthPerBot = memoizedCalculations.getBotStats(battalion.type, isUser).health;
    const botsLost = Math.floor(damage / healthPerBot);
    
    if (botsLost > 0) {
      const newQuantity = Math.max(0, battalion.quantity - botsLost);
      
      if (isUser) {
        setUserBattalions(prev => prev.map(b => 
          b.nodeIndex === battalion.nodeIndex 
            ? { ...b, quantity: newQuantity }
            : b
        ));
      } else {
        setEnemyBattalions(prev => prev.map(b => 
          b.nodeIndex === battalion.nodeIndex 
            ? { ...b, quantity: newQuantity }
            : b
        ));
      }

      // Record the loss
      onBattalionLoss(
        isUser ? 'user' : 'enemy',
        `${battalion.type}-${battalion.nodeIndex}`,
        botsLost,
        battalion.mark || 1 // Default to mark 1 if not specified
      );

      return newQuantity === 0; // Return true if battalion is destroyed
    }
    return false;
  };

  // Optimized battalion vs battalion attack setup
  const setupBattalionAttacks = (
    battalion: BattalionPosition,
    targetBattalion: BattalionPosition,
    isUser: boolean
  ) => {
    const attackerKey = createBattalionKey(isUser, battalion.nodeIndex);
    const targetKey = createBattalionKey(!isUser, targetBattalion.nodeIndex);
    const intervalKey = `${attackerKey}-${targetBattalion.nodeIndex}`;

    // Clear any existing attack interval
    if (attackIntervals.current[intervalKey]) {
      clearInterval(attackIntervals.current[intervalKey]);
    }

    const attackSpeed = memoizedCalculations.getBotStats(battalion.type).speed;
    const attackInterval = memoizedCalculations.getAttackInterval(battalion.type);
    const totalDamage = calculateTotalDamage(battalion, isUser);

    const performBattalionAttack = () => {
      battalionRefs.current[attackerKey]?.triggerAttackAnimation();
      
      setTimeout(() => {
        battalionRefs.current[targetKey]?.triggerDamageAnimation();
        const isDestroyed = handleBattalionDamage(targetBattalion, totalDamage, !isUser);
        
        if (isDestroyed) {
          clearInterval(attackIntervals.current[intervalKey]);
          delete attackIntervals.current[intervalKey];
          
          // Find new target
          const newTargets = findAvailableTargets(
            battalion,
            isUser,
            battalionsRef.current.user,
            battalionsRef.current.enemy
          );
          
          if (newTargets.length > 0) {
            moveBattalionAlongPath(
              battalion,
              newTargets[0],
              isUser,
              battalionsRef.current.user,
              battalionsRef.current.enemy
            );
          }
        }
      }, ATTACK_DELAY);
    };

    // Initial attack
    performBattalionAttack();
    
    // Set up interval for subsequent attacks
    attackIntervals.current[intervalKey] = setInterval(performBattalionAttack, attackInterval);
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
    setupBattalionAttacks,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath,
    handleNodeCapture
  };
}; 