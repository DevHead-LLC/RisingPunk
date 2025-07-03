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
import { BATTALION_CENTER_OFFSET } from '../utils/battleConstants';
import { isNeutral } from '../utils/nodeOwnership';
import type { BattalionRefs, NodeRefs, AttackIntervals, OnBattalionLoss } from './useBattalionRefsAndState';

// Constants
const ATTACK_DELAY = 300;
const INITIAL_ATTACK_DELAY = 500;

// Helper functions
const createBattalionKey = (isUser: boolean, nodeIndex: number) => 
  `${isUser ? 'user' : 'enemy'}-${nodeIndex}`;

const createAttackIntervalKey = (isUser: boolean, battalionNodeIndex: number, targetNodeIndex: number) => 
  `${isUser ? 'user' : 'enemy'}-${battalionNodeIndex}-${targetNodeIndex}`;

// Utility: Calculate the point along the line from start to end that is 'range' away from end
export function getAttackRangeIntersectionPoint(start, end, range) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance === 0) return { x: end.x, y: end.y };
  
  // Move from end toward start by 'range' units
  // This calculates where the battalion's attack range edge should intersect with the target center
  const ratio = (distance - range) / distance;
  const intersectionPoint = {
    x: start.x + dx * ratio,
    y: start.y + dy * ratio
  };
  
  return intersectionPoint;
}

export const useBattleEngine = (
  battleStarted: boolean,
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

  // Battle initialization - find initial targets for all battalions
  useEffect(() => {
    if (battleStarted && !battleInitializedRef.current) {
      // Wait for battalions to be initialized before starting
      const initializeBattle = (retryCount = 0) => {
        if (retryCount >= 50) {
          return;
        }
        
        if (!battalionsRef.current || !battalionsRef.current.user || !battalionsRef.current.enemy) {
          setTimeout(() => initializeBattle(retryCount + 1), 100);
          return;
        }
        
        battleInitializedRef.current = true;

        const selectTargetNode = (battalion: BattalionPosition) => {
          let availableNodes = getConnectedNodes(battalion.nodeIndex);
          
          availableNodes = availableNodes.filter(nodeIndex => {
            return isNeutral(nodeIndex);
          });

          if (availableNodes.length === 0) {
            availableNodes = getConnectedNodes(battalion.nodeIndex).filter(nodeIndex => {
              return isNeutral(nodeIndex);
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
          // Validate that the target node is still neutral before setting up attacks
          if (!isNeutral(targetNodeIndex)) {
            return;
          }

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
          battalions.forEach((battalion, index) => {
            const targetNodeIndex = selectTargetNode(battalion);
            
            // Skip if no valid neutral target found
            if (targetNodeIndex === undefined) {
              return;
            }
            
            // TODO: REMOVE this line - don't track targeted nodes
            // targetedNodes.add(targetNodeIndex);
            
            const targetNode = nodesRef.current[targetNodeIndex];
            const range = memoizedCalculations.getAttackRange(battalion.type);
            
            // Calculate duration based on speed stat
            const speedStat = memoizedCalculations.getBotStats(battalion.type).speed;
            const duration = memoizedCalculations.getMovementDuration(speedStat);
            
            // Get battalion's current node position (start)
            const startNode = nodesRef.current[battalion.nodeIndex];
            const endNode = targetNode;
            // Calculate intersection point along the network line
            let intersection = getAttackRangeIntersectionPoint(
              { x: startNode.x, y: startNode.y },
              { x: endNode.x, y: endNode.y },
              range
            );
            // Adjust for battalion's visual center offset
            intersection = {
              x: intersection.x - BATTALION_CENTER_OFFSET,
              y: intersection.y - BATTALION_CENTER_OFFSET
            };
            
            const anim = Animated.timing(battalion.position, {
              toValue: intersection,
              duration: duration,
              useNativeDriver: true
            });

            const listener = battalion.position.addListener(({ x, y }: { x: number; y: number }) => {
              // FIXED: More precise range checking with tolerance for floating point precision
              // Battalion should stop when its attack range edge touches the node center
              const battalionCenter = {
                x: x + BATTALION_CENTER_OFFSET,
                y: y + BATTALION_CENTER_OFFSET
              };
              
              const distanceToNode = Math.sqrt(
                Math.pow(battalionCenter.x - targetNode.x, 2) + 
                Math.pow(battalionCenter.y - targetNode.y, 2)
              );
              
              // Use tolerance for floating point precision (within 2 pixels of exact range)
              const tolerance = 2;
              const inRange = Math.abs(distanceToNode - range) <= tolerance;
              
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
      };

      initializeBattle();
    }
  }, [battleStarted]);

  return {
    memoizedCalculations
  };
}; 