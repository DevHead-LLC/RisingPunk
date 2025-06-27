import { useMemo, useEffect } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { BattleNode, BattalionPosition } from '../types/battle';
import { getConnectedNodes } from '../utils/networkConstants';
import { checkRangeIntersection } from '../utils/battleCalculator';
import {
  calculateMovementDuration,
  calculateAttackInterval,
  calculateAttackRange,
  calculateTotalDamage
} from '../utils/battleUtils';
import type { BattalionRefs, NodeRefs, AttackIntervals, OnBattalionLoss } from './useBattalionRefsAndState';

// Constants
const BATTALION_CENTER_OFFSET = 25;
const ATTACK_DELAY = 300;
const INITIAL_ATTACK_DELAY = 500;

// Helper functions
const createBattalionKey = (isUser: boolean, nodeIndex: number) => 
  `${isUser ? 'user' : 'enemy'}-${nodeIndex}`;

const createAttackIntervalKey = (isUser: boolean, battalionNodeIndex: number, targetNodeIndex: number) => 
  `${isUser ? 'user' : 'enemy'}-${battalionNodeIndex}-${targetNodeIndex}`;

const sortBattalionsByPriority = (battalions: BattalionPosition[]) => {
  // Sort by type priority: guardian > breacher > phreak
  const typePriority = { guardian: 3, breacher: 2, phreak: 1 };
  return [...battalions].sort((a, b) => 
    (typePriority[b.type as keyof typeof typePriority] || 0) - 
    (typePriority[a.type as keyof typeof typePriority] || 0)
  );
};

export const useBattleEngine = (
  battleStarted: boolean,
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[],
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  onBattalionLoss: OnBattalionLoss,
  battalionRefs: React.MutableRefObject<BattalionRefs>,
  attackIntervals: React.MutableRefObject<AttackIntervals>,
  nodeRefs: React.MutableRefObject<NodeRefs>,
  battleInitializedRef: React.MutableRefObject<boolean>,
  battalionsRef: React.MutableRefObject<{ user: BattalionPosition[]; enemy: BattalionPosition[] }>,
  nodesRef: React.MutableRefObject<BattleNode[]>,
  findAvailableTargets: (battalion: any, isUser: boolean, userBattalions: any[], enemyBattalions: any[]) => any[],
  moveBattalionAlongPath: (battalion: any, target: any, isUser: boolean, userBattalions?: any[], enemyBattalions?: any[]) => void
) => {
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

  return {
    memoizedCalculations
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
  }, [battleStarted, memoizedCalculations, findAvailableTargets, moveBattalionAlongPath, nodesRef, battalionsRef, attackIntervals, battalionRefs, nodeRefs]);

  return {
    memoizedCalculations
  };
}; 