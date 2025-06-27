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
  handlePostMovementActions
} from './useMovement';
import { useTargeting } from './useTargeting';
import type { BattalionRefs, NodeRefs, AttackIntervals, OnBattalionLoss } from './useBattalionRefsAndState';

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
    
    // Validate battalion and target
    const validation = validateBattalionAndTarget(
      battalion,
      target,
      nodes,
      currentPos,
      range,
      cleanupBattalion,
      battalionId,
      attackIntervals.current
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
      return;
    }
    
    // If in range, start attacking
    if (validation.inRange) {
      setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
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
        setupAttacks,
        battalionId,
        isUser,
        userBattalions,
        enemyBattalions
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
    
    // Calculate movement distance and direction
    const movementResult = calculateMovementDistance(
      currentPos,
      target,
      range,
      isUser,
      userBattalions,
      enemyBattalions
    );
    
    const { moveDistance, updatedDistance, rangePosition } = movementResult;
    
    // If we're already in range but the moveDistance calculation is wrong, start attacking anyway
    if (updatedDistance <= range) {
      setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      return;
    }

    // Execute movement animation
    executeBattalionMovement(
      battalion,
      rangePosition,
      moveDistance,
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
          setupAttacks,
          debugLog,
          userBattalions,
          enemyBattalions
        );
      }
    );
  }, [nodes, findAvailableTargets]);

  // Setup attacks with improved cleanup and node capture handling
  const setupAttacks = useCallback((
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    battalionId: string,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ): void => {
    if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
      cleanupBattalion(battalionId, attackIntervals.current);
      return;
    }

    const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
    const attackInterval = 2000 * (5 / attackSpeed);
    const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
    const totalDamage = attackPower * battalion.quantity;
    
    cleanupBattalion(battalionId, attackIntervals.current);

    setTimeout(() => {
      if (target.type === 'node') {
        const nodeRef = nodeRefs.current[target.index];
        if (!nodeRef || battalion.quantity <= 0 || battalion.currentHealth <= 0) {
          cleanupBattalion(battalionId, attackIntervals.current);
          return;
        }

        // Set up recurring attacks
        const intervalKey = `${battalionId}-node-${target.index}`;
        const attackFn = () => {
          if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
            cleanupBattalion(battalionId, attackIntervals.current);
            return;
          }

          const node = nodes[target.index];
          // Only retarget if node is not neutral (captured)
          if (node.controlState !== 'neutral') {
            cleanupBattalion(battalionId, attackIntervals.current);
            battalion.targetNode = undefined;
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
            if (newTargets.length > 0) {
              moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
            }
          }

          // Apply damage
          const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
          if (!damageApplied) {
            cleanupBattalion(battalionId, attackIntervals.current);
            battalion.targetNode = undefined;
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
            if (newTargets.length > 0) {
              moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
            }
          }
        };

        attackIntervals.current[intervalKey] = setInterval(attackFn, attackInterval);
        // Execute first attack immediately
        attackFn();
      } else if (target.type === 'battalion') {
        const enemyBatts = isUser ? enemyBattalions : userBattalions;
        if (!enemyBatts) return;

        const enemyBattalion = enemyBatts[target.index];
        if (!enemyBattalion || enemyBattalion.quantity <= 0 || enemyBattalion.currentHealth <= 0) {
          const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
          if (newTargets.length > 0) {
            moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
          }
          return;
        }

        const enemyId = `${!isUser ? 'user' : 'enemy'}-${enemyBattalion.type}-${enemyBattalion.nodeIndex}`;
        const intervalKey = `${battalionId}-${enemyId}`;
        
        const attackFn = () => {
          if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
            cleanupBattalion(battalionId, attackIntervals.current);
            return;
          }

          const updateStateFn = (prevBatts: BattalionPosition[]) => {
            const updatedBatts = [...prevBatts];
            const targetBatt = updatedBatts[target.index];
            
            if (!targetBatt || targetBatt.quantity <= 0 || targetBatt.currentHealth <= 0) {
              cleanupBattalion(battalionId, attackIntervals.current);
              return prevBatts;
            }

            const wasDestroyed = updateBattalionHealth(targetBatt, targetBatt.currentHealth - totalDamage);
            
            // Schedule retargeting if target was destroyed
            if (wasDestroyed) {
              setTimeout(() => {
                const newTargets = findAvailableTargets(
                  battalion,
                  isUser,
                  isUser ? userBattalions! : updatedBatts,
                  isUser ? updatedBatts : enemyBattalions!
                );
                if (newTargets.length > 0) {
                  moveBattalionAlongPath(
                    battalion,
                    newTargets[0],
                    isUser,
                    isUser ? userBattalions : updatedBatts,
                    isUser ? updatedBatts : enemyBattalions
                  );
                }
              }, 0);
            }
            
            return updatedBatts;
          };

          if (isUser) {
            setEnemyBattalions(updateStateFn);
          } else {
            setUserBattalions(updateStateFn);
          }
        };

        attackIntervals.current[intervalKey] = setInterval(attackFn, attackInterval);
        // Execute first attack immediately
        attackFn();
      }
    }, 150);
  }, [findAvailableTargets, moveBattalionAlongPath, nodes]);

  // Memoized calculations for performance optimization
  const memoizedCalculations = useMemo(() => {
    const calculations: { [key: string]: any } = {};
    
    // Cache bot category stats to avoid repeated lookups
    const botStats = new Map<string, any>();
    const getBotStats = (type: string, isUser: boolean = true) => {
      const key = `${type}-${isUser ? 'user' : 'enemy'}`;
      if (!botStats.has(key)) {
        const baseStats = BOT_CATEGORIES[type].stats;
        if (isUser) {
          botStats.set(key, baseStats);
        } else {
          // Enemy bots have much higher attack power
          botStats.set(key, {
            ...baseStats,
            offense: baseStats.offense * 4, // 4x higher attack power
            health: baseStats.health * 2    // 2x higher health
          });
        }
      }
      return botStats.get(key);
    };

    // Cache attack intervals by battalion type and speed
    const attackIntervals = new Map<string, number>();
    const getAttackInterval = (type: string) => {
      const key = `attack-${type}`;
      if (!attackIntervals.has(key)) {
        const speed = getBotStats(type).speed;
        attackIntervals.set(key, calculateAttackInterval(speed));
      }
      return attackIntervals.get(key);
    };

    // Cache attack ranges by battalion type
    const attackRanges = new Map<string, number>();
    const getAttackRange = (type: string) => {
      if (!attackRanges.has(type)) {
        attackRanges.set(type, calculateAttackRange(type));
      }
      return attackRanges.get(type);
    };

    // Cache movement durations by speed
    const movementDurations = new Map<number, number>();
    const getMovementDuration = (speed: number) => {
      if (!movementDurations.has(speed)) {
        movementDurations.set(speed, calculateMovementDuration(speed));
      }
      return movementDurations.get(speed);
    };

    return {
      getBotStats,
      getAttackInterval,
      getAttackRange,
      getMovementDuration
    };
  }, []);

  // Update refs when battalions change
  useEffect(() => {
    battalionsRef.current = { user: userBattalions, enemy: enemyBattalions };
  }, [userBattalions, enemyBattalions]);

  // Update nodes ref when nodes change
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // IMPORTANT: Handle battalion movement and attacks
  useEffect(() => {
    if (battleStarted && !battleInitializedRef.current) {
      battleInitializedRef.current = true;

      // Strategic target selection function
      const selectTargetNode = (battalion: BattalionPosition, isUser: boolean, targetedNodes: Set<number>) => {
        let availableNodes = getConnectedNodes(battalion.nodeIndex);
        
        // Filter out already targeted nodes
        availableNodes = availableNodes.filter(nodeIndex => {
          return !targetedNodes.has(nodeIndex);
        });

        // If no untargeted nodes available, expand search
        if (availableNodes.length === 0) {
          availableNodes = getConnectedNodes(battalion.nodeIndex);
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
  }, [battleStarted]); // Only depend on battleStarted

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
    setupAttacks,
    setupBattalionAttacks,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath,
    handleNodeCapture
  };
}; 