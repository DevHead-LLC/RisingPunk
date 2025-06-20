import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { checkRangeIntersection } from '../utils/battleCalculator';
import { BattleNode, BattalionPosition } from '../types/battle';
import { useBattleMovement } from './useBattleMovement';
import { BattalionRef } from '../components/battle/AnimatedBattalion';
import {
  RETARGET_COOLDOWN,
  CAPTURE_MEMORY_DURATION,
  ATTACK_DELAY,
  INITIAL_ATTACK_DELAY,
  BATTALION_CENTER_OFFSET
} from '../utils/battleConstants';
import {
  calculateMovementDuration,
  calculateAttackInterval,
  calculateAttackRange,
  calculateTotalDamage,
  getAvailableNodes,
  createBattalionKey,
  createAttackIntervalKey,
  sortBattalionsByPriority
} from '../utils/battleUtils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Battalion references for animations */
interface BattalionRefs {
  [key: string]: BattalionRef;
}

/** Node references for damage animations */
interface NodeRefs {
  [key: string]: {
    triggerDamageAnimation: () => void;
    applyDamage: (damage: number, isUser: boolean) => boolean;
  } | null;
}

/** Attack intervals tracking */
interface AttackIntervals {
  [key: string]: NodeJS.Timeout;
}

/** Battalion loss callback type */
type OnBattalionLoss = (
  side: 'user' | 'enemy',
  battalionId: string,
  quantity: number,
  mark: number
) => void;

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook managing all battalion movement and attack logic
 * @param battleStarted - Whether battle has started
 * @param nodes - Array of battle nodes
 * @param userBattalions - User battalion positions
 * @param enemyBattalions - Enemy battalion positions
 * @param setUserBattalions - Function to update user battalions
 * @param setEnemyBattalions - Function to update enemy battalions
 * @param onBattalionLoss - Callback for battalion losses
 * @returns Object with refs and utility functions
 */
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

  const {
    getAnimatedPosition,
    findAvailableTargets,
    calculateMovementDuration: movementDurationFromHook,
    moveBattalionAlongPath
  } = useBattleMovement(nodes, battalionRefs, attackIntervals, nodeRefs, setUserBattalions, setEnemyBattalions);

  // Memoized calculations for performance optimization
  const memoizedCalculations = useMemo(() => {
    const calculations: { [key: string]: any } = {};
    
    // Cache bot category stats to avoid repeated lookups
    const botStats = new Map<string, any>();
    const getBotStats = (type: string) => {
      if (!botStats.has(type)) {
        botStats.set(type, BOT_CATEGORIES[type].stats);
      }
      return botStats.get(type);
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
        let availableNodes = getAvailableNodes(battalion.nodeIndex);
        
        // Filter out already targeted nodes unless it's a guardian supporting another unit
        availableNodes = availableNodes.filter(nodeIndex => {
          if (battalion.type === 'guardian') return true;
          return !targetedNodes.has(nodeIndex);
        });

        // If no untargeted nodes available, expand search
        if (availableNodes.length === 0) {
          availableNodes = getAvailableNodes(battalion.nodeIndex);
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
        const totalDamage = calculateTotalDamage(battalion);

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
    const healthPerBot = memoizedCalculations.getBotStats(battalion.type).health;
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
  const setupAttacks = (
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
    const totalDamage = calculateTotalDamage(battalion);

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

  // Strategic target selection with improved logic
  const findNewTarget = (battalion: BattalionPosition, isUser: boolean) => {
    const battalionId = `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`;
    
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

    // Strategic target selection based on battalion type
    let targets: typeof allTargets = [];
    
    if (battalion.type === 'guardian') {
      // Guardians prioritize defending controlled nodes and capturing neutral nodes
      targets = allTargets.filter(target => {
        if (target.type === 'node') {
          const node = nodesRef.current[target.index];
          const isOurNode = (isUser && node.controlState === 'user') || (!isUser && node.controlState === 'enemy');
          
          // Stay at current node if we control it
          if (isOurNode && target.index === battalion.nodeIndex) {
            return true;
          }
          // Target neutral nodes for capture
          return node.controlState === 'neutral';
        }
        return false;
      });
      
      // If no neutral nodes, find controlled nodes to defend
      if (targets.length === 0) {
        targets = allTargets.filter(target => {
          if (target.type === 'node') {
            const node = nodesRef.current[target.index];
            return (isUser && node.controlState === 'user') || (!isUser && node.controlState === 'enemy');
          }
          return false;
        });
      }
    } else {
      // Non-guardians prioritize neutral nodes, then enemy battalions
      targets = allTargets.filter(target => {
        if (target.type === 'node') {
          const node = nodesRef.current[target.index];
          // Avoid recently captured nodes
          return node.controlState === 'neutral' && !recentlyCapturedNodes.current.has(target.index);
        }
        return false;
      });
      
      // If no neutral nodes, attack enemy battalions
      if (targets.length === 0) {
        targets = allTargets.filter(target => target.type === 'battalion');
      }
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

  return {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
    setupAttacks
  };
}; 