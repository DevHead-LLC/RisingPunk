import { useEffect, useRef, useMemo, useCallback } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { checkRangeIntersection } from '../utils/battleCalculator';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { getConnectedNodes } from '../utils/networkConstants';
import { updateBattalionHealth } from '../utils/healthUtils';
import {
  RETARGET_COOLDOWN,
  CAPTURE_MEMORY_DURATION,
  ATTACK_DELAY,
  INITIAL_ATTACK_DELAY,
  BATTALION_CENTER_OFFSET,
  RANGE_MULTIPLIER
} from '../utils/battleConstants';
import {
  calculateMovementDuration,
  calculateAttackInterval,
  calculateAttackRange,
  calculateTotalDamage,
  createBattalionKey,
  createAttackIntervalKey,
  sortBattalionsByPriority
} from '../utils/battleUtils';
import { findShortestPaths, reconstructPath } from '../utils/pathfinding';
import { debugLog } from './useBattalionRefsAndState';
import { findBattalionIndexAndId } from './useBattalionRefsAndState';
import { 
  getAnimatedPosition, 
  cleanupBattalion,
  validateBattalionAndTarget,
  handleNodePathCalculation,
  handleBattalionPathFollowing,
  setupBattalionPathFollowing,
  checkForInfiniteLoop,
  calculateMovementDistance,
  executeBattalionMovement,
  handlePostMovementActions,
  handleMovementValidation,
  handleMovementDecision
} from './useMovement';
import { useTargeting } from './useTargeting';
import { useBattleEngine } from './useBattleEngine';
import type { BattalionRefs, NodeRefs, AttackIntervals, OnBattalionLoss } from './useBattalionRefsAndState';
import { 
  setupAttacks as setupAttacksFromCombat,
  handleBattalionDamage as handleBattalionDamageFromCombat
} from './useCombat';

export const useBattleMovementAndAttacks = (
  battleStarted: boolean,
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[],
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  onBattalionLoss: OnBattalionLoss
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

  // Use targeting hook
  const { findAvailableTargets } = useTargeting(nodes);

  const moveBattalionAlongPath = useCallback((
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ): void => {
    // Generate battalion ID
    const { battalionId } = findBattalionIndexAndId(battalion, isUser, userBattalions, enemyBattalions);
    
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
      findAvailableTargets,
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
          findAvailableTargets,
          moveBattalionAlongPath,
          setUserBattalions,
          setEnemyBattalions,
          userBattalions,
          enemyBattalions
        );
      }
      return;
    }
    
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
        attackIntervals.current,
        cleanupBattalion,
        nodeRefs.current,
        findAvailableTargets,
        moveBattalionAlongPath,
        setUserBattalions,
        setEnemyBattalions
      );
      
      if (!pathResult.shouldContinue) {
        return;
      }
      
      if (pathResult.updatedTarget) {
        target.position = pathResult.updatedTarget.position;
      }
    } else if (target.type === 'battalion') {
      // Handle battalion path following
      const pathFollowingResult = handleBattalionPathFollowing(
        battalion,
        target,
        nodes,
        battalionId,
        checkForInfiniteLoop,
        debugLog,
        moveBattalionAlongPath,
        isUser,
        userBattalions,
        enemyBattalions
      );
      
      if (!pathFollowingResult.shouldContinue) {
        return;
      }
      
      const enemyBatts = isUser ? enemyBattalions : userBattalions;
      const enemyBattalion = enemyBatts?.[target.index];
      
      if (!enemyBattalion) return;
      
      const enemyRange = BOT_CATEGORIES[enemyBattalion.type].stats.range * RANGE_MULTIPLIER;
      
      // Setup path following for battalion targets
      setupBattalionPathFollowing(
        battalion,
        target,
        enemyBattalion,
        nodes,
        findShortestPaths,
        reconstructPath,
        battalionId,
        debugLog
      );
    }
    
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
        attackIntervals.current,
        cleanupBattalion,
        nodeRefs.current,
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
      attackIntervals.current,
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
          debugLog,
          userBattalions,
          enemyBattalions,
          attackIntervals.current,
          cleanupBattalion,
          nodeRefs.current,
          setUserBattalions,
          setEnemyBattalions
        );
      }
    );
  }, [nodes, findAvailableTargets]);

  // Use battle engine for orchestration
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

  // Strategic target selection with unified logic
  const findNewTarget = (battalion: BattalionPosition, isUser: boolean) => {
    // Generate battalion ID
    const { battalionId } = findBattalionIndexAndId(battalion, isUser, battalionsRef.current.user, battalionsRef.current.enemy);
    
    // Check cooldown
    const now = Date.now();
    const lastRetarget = retargetCooldowns.current[battalionId] || 0;
    if (now - lastRetarget < RETARGET_COOLDOWN) {
      return; // Still in cooldown
    }
    
    // Get all available targets
    const allTargets = findAvailableTargets(
      battalion,
      isUser,
      battalionsRef.current.user,
      battalionsRef.current.enemy
    );

    // Unified target selection - all battalion types behave identically
    let targets: typeof allTargets = [];
    
    // All battalions prioritize neutral nodes, then enemy battalions
    targets = allTargets.filter(target => {
      if (target.type === 'node') {
        const node = nodesRef.current[target.index];
        // Only target neutral nodes, not captured ones
        return node.controlState === 'neutral' && !recentlyCapturedNodes.current.has(target.index);
      }
      return false;
    });
    
    // If no neutral nodes, attack enemy battalions
    if (targets.length === 0) {
      targets = allTargets.filter(target => target.type === 'battalion');
    }
    
    if (targets.length > 0) {
      const target = targets[0];
      
      // Set cooldown
      retargetCooldowns.current[battalionId] = now;
      
      // If targeting a node, mark it as recently captured
      if (target.type === 'node') {
        recentlyCapturedNodes.current.add(target.index);
        setTimeout(() => {
          recentlyCapturedNodes.current.delete(target.index);
        }, CAPTURE_MEMORY_DURATION);
      }
      
      moveBattalionAlongPath(
        battalion,
        target,
        isUser,
        battalionsRef.current.user,
        battalionsRef.current.enemy
      );
    }
  };

  // Battle initialization - find initial targets for all battalions
  useEffect(() => {
    if (battleStarted && !battleInitializedRef.current) {
      battleInitializedRef.current = true;

      // Strategic target selection function
      const selectTargetNode = (battalion: BattalionPosition, isUser: boolean, targetedNodes: Set<number>) => {
        let availableNodes = getConnectedNodes(battalion.nodeIndex);
        
        // Filter out already targeted nodes AND non-neutral nodes
        availableNodes = availableNodes.filter(nodeIndex => {
          const node = nodesRef.current[nodeIndex];
          // Only target neutral nodes, not controlled ones
          return !targetedNodes.has(nodeIndex) && node.controlState === 'neutral';
        });

        // If no untargeted neutral nodes available, expand search to any neutral nodes
        if (availableNodes.length === 0) {
          availableNodes = getConnectedNodes(battalion.nodeIndex).filter(nodeIndex => {
            const node = nodesRef.current[nodeIndex];
            return node.controlState === 'neutral';
          });
        }

        // If still no neutral nodes, return undefined (no valid target)
        if (availableNodes.length === 0) {
          return undefined;
        }

        return availableNodes[Math.floor(Math.random() * availableNodes.length)];
      };

      // Node attack setup function
      const setupNodeAttack = (
        battalion: BattalionPosition,
        targetNodeIndex: number,
        isUser: boolean
      ) => {
        const existingKey = createAttackIntervalKey(isUser, battalion.nodeIndex, targetNodeIndex);
        
        // Clear any existing attack interval
        if (attackIntervals.current[existingKey]) {
          clearInterval(attackIntervals.current[existingKey]);
        }

        const attackInterval = memoizedCalculations.getAttackInterval(battalion.type);
        const totalDamage = calculateTotalDamage(battalion, isUser);

        const performNodeAttack = () => {
          battalionRefs.current[createBattalionKey(isUser, battalion.nodeIndex)]?.triggerAttackAnimation();
          
          setTimeout(() => {
            const nodeRef = nodeRefs.current[targetNodeIndex];
            if (nodeRef) {
              nodeRef.triggerDamageAnimation();
              const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
              if (!damageApplied) {
                // Node was captured or destroyed, find new target
                const newTargets = findAvailableTargets(battalion, isUser, battalionsRef.current.user, battalionsRef.current.enemy);
                if (newTargets.length > 0) {
                  moveBattalionAlongPath(battalion, newTargets[0], isUser, battalionsRef.current.user, battalionsRef.current.enemy);
                }
                clearInterval(attackIntervals.current[existingKey]);
                delete attackIntervals.current[existingKey];
              }
            }
          }, ATTACK_DELAY);
        };

        // Initial attack
        setTimeout(performNodeAttack, INITIAL_ATTACK_DELAY);
        
        // Set up interval for subsequent attacks
        attackIntervals.current[existingKey] = setInterval(performNodeAttack, attackInterval);
      };

      // Consolidated function to handle battalion actions for both sides
      const handleBattalionActions = (battalions: BattalionPosition[], isUser: boolean) => {
        const targetedNodes = new Set<number>();
        const sortedBattalions = sortBattalionsByPriority(battalions);

        sortedBattalions.forEach(battalion => {
          const targetNodeIndex = selectTargetNode(battalion, isUser, targetedNodes);
          
          // Skip if no valid neutral target found
          if (targetNodeIndex === undefined) {
            return;
          }
          
          targetedNodes.add(targetNodeIndex);

          const targetNode = nodesRef.current[targetNodeIndex];
          const range = memoizedCalculations.getAttackRange(battalion.type);
          
          // Calculate duration based on speed stat
          const speedStat = memoizedCalculations.getBotStats(battalion.type).speed;
          const duration = memoizedCalculations.getMovementDuration(speedStat);
          
          const anim = Animated.timing(battalion.position, {
            toValue: { 
              x: targetNode.x - BATTALION_CENTER_OFFSET,
              y: targetNode.y - BATTALION_CENTER_OFFSET
            },
            duration: duration,
            useNativeDriver: true
          });

          const listener = battalion.position.addListener(({ x, y }: { x: number; y: number }) => {
            const battalionCenter = {
              x: x + BATTALION_CENTER_OFFSET,
              y: y + BATTALION_CENTER_OFFSET
            };
            
            const inRange = checkRangeIntersection(
              battalionCenter,
              { x: targetNode.x, y: targetNode.y },
              range
            );

            if (inRange) {
              anim.stop();
              battalion.position.removeListener(listener);
              setupNodeAttack(battalion, targetNodeIndex, isUser);
            }
          });

          anim.start();
        });
      };

      // Handle both user and enemy battalions with the same function
      handleBattalionActions(battalionsRef.current.user, true);
      handleBattalionActions(battalionsRef.current.enemy, false);

      return () => {
        Object.values(attackIntervals.current).forEach(interval => clearInterval(interval));
        attackIntervals.current = {};
        battalionsRef.current.user.forEach(battalion => battalion.position.removeAllListeners());
        battalionsRef.current.enemy.forEach(battalion => battalion.position.removeAllListeners());
        battleInitializedRef.current = false;
      };
    }
  }, [battleStarted, memoizedCalculations, findAvailableTargets, moveBattalionAlongPath]);

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