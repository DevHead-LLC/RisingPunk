import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { checkRangeIntersection } from '../utils/battleCalculator';
import { BattleNode, BattalionPosition } from '../types/battle';
import { useBattleMovement } from './useBattleMovement';
import { BattalionRef } from '../components/battle/AnimatedBattalion';

// IMPORTANT: Keep these type definitions for reference
interface BattalionRefs {
  [key: string]: BattalionRef;
}

interface NodeRefs {
  [key: string]: {
    triggerDamageAnimation: () => void;
    applyDamage: (damage: number, isUser: boolean) => boolean;
  } | null;
}

interface AttackIntervals {
  [key: string]: NodeJS.Timeout;
}

// IMPORTANT: This hook manages all battalion movement and attack logic
export const useBattleMovementAndAttacks = (
  battleStarted: boolean,
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[],
) => {
  // IMPORTANT: Keep refs for animations and intervals
  const battalionRefs = useRef<BattalionRefs>({});
  const attackIntervals = useRef<AttackIntervals>({});
  const nodeRefs = useRef<NodeRefs>({});

  const {
    getAnimatedPosition,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath
  } = useBattleMovement(nodes, battalionRefs, attackIntervals, nodeRefs);

  // IMPORTANT: Handle battalion movement and attacks
  useEffect(() => {
    if (battleStarted) {
      // Base duration for slowest speed (speed stat of 5)
      const BASE_DURATION = 5000; // 3 seconds for base movement
      
      // Handle user battalions
      userBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 0: availableNodes = [3, 4]; break;
          case 1: availableNodes = [3, 4, 5]; break;
          case 2: availableNodes = [4, 5]; break;
        }
        
        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        const targetNode = nodes[targetNodeIndex];
        const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
        
        // Calculate duration based on speed stat
        const speedStat = BOT_CATEGORIES[battalion.type].stats.speed;
        const duration = BASE_DURATION * (5 / speedStat);
        
        const anim = Animated.timing(battalion.position, {
          toValue: { 
            x: targetNode.x - 10,
            y: targetNode.y - 10
          },
          duration: duration,
          useNativeDriver: true
        });

        const listener = battalion.position.addListener(({ x, y }) => {
          const battalionCenter = {
            x: x + 10,
            y: y + 10
          };
          
          const inRange = checkRangeIntersection(
            battalionCenter,
            { x: targetNode.x, y: targetNode.y },
            range
          );

          if (inRange) {
            anim.stop();
            battalion.position.removeListener(listener);
            
            // Clear any existing attack interval
            if (attackIntervals.current[`user-${battalion.nodeIndex}`]) {
              clearInterval(attackIntervals.current[`user-${battalion.nodeIndex}`]);
            }

            // Start continuous attack with a small initial delay
            const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
            const attackInterval = 2000 * (5 / attackSpeed);
            
            // Trigger first attack after 150ms
            setTimeout(() => {
              battalionRefs.current[`user-${battalion.nodeIndex}`]?.triggerAttackAnimation();
              
              // Calculate damage with quantity
              const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
              const totalDamage = attackPower * battalion.quantity;
              
              // Apply damage after attack animation
              setTimeout(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  nodeRef.triggerDamageAnimation();
                  const damageApplied = nodeRef.applyDamage(totalDamage, true);
                  if (!damageApplied) {
                    clearInterval(attackIntervals.current[`user-${battalion.nodeIndex}`]);
                    delete attackIntervals.current[`user-${battalion.nodeIndex}`];
                  }
                }
              }, 100);
              
              // Set up continuous attack interval
              attackIntervals.current[`user-${battalion.nodeIndex}-${targetNodeIndex}`] = setInterval(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  battalionRefs.current[`user-${battalion.nodeIndex}`]?.triggerAttackAnimation();
                  setTimeout(() => {
                    nodeRef.triggerDamageAnimation();
                    const damageApplied = nodeRef.applyDamage(totalDamage, true);
                    if (!damageApplied) {
                      clearInterval(attackIntervals.current[`user-${battalion.nodeIndex}-${targetNodeIndex}`]);
                      delete attackIntervals.current[`user-${battalion.nodeIndex}-${targetNodeIndex}`];
                    }
                  }, 100);
                }
              }, attackInterval);
            }, 150);
          }
        });

        anim.start();
      });

      // Handle enemy battalions
      enemyBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 6: availableNodes = [3, 4]; break;
          case 7: availableNodes = [3, 4, 5]; break;
          case 8: availableNodes = [4, 5]; break;
        }
        
        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        const targetNode = nodes[targetNodeIndex];
        const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
        
        const speedStat = BOT_CATEGORIES[battalion.type].stats.speed;
        const duration = BASE_DURATION * (5 / speedStat);
        
        const anim = Animated.timing(battalion.position, {
          toValue: { 
            x: targetNode.x - 10,
            y: targetNode.y - 10
          },
          duration: duration,
          useNativeDriver: true
        });

        const enemyListener = battalion.position.addListener(({ x, y }) => {
          const battalionCenter = {
            x: x + 10,
            y: y + 10
          };
          
          const inRange = checkRangeIntersection(
            battalionCenter,
            { x: targetNode.x, y: targetNode.y },
            range
          );

          if (inRange) {
            anim.stop();
            battalion.position.removeListener(enemyListener);
            
            if (attackIntervals.current[`enemy-${battalion.nodeIndex}`]) {
              clearInterval(attackIntervals.current[`enemy-${battalion.nodeIndex}`]);
            }

            const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
            const attackInterval = 2000 * (5 / attackSpeed);
            
            setTimeout(() => {
              battalionRefs.current[`enemy-${battalion.nodeIndex}`]?.triggerAttackAnimation();
              
              const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
              const totalDamage = attackPower * battalion.quantity;
              
              setTimeout(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  nodeRef.triggerDamageAnimation();
                  const damageApplied = nodeRef.applyDamage(totalDamage, false);
                  if (!damageApplied) {
                    clearInterval(attackIntervals.current[`enemy-${battalion.nodeIndex}`]);
                    delete attackIntervals.current[`enemy-${battalion.nodeIndex}`];
                  }
                }
              }, 100);
              
              attackIntervals.current[`enemy-${battalion.nodeIndex}-${targetNodeIndex}`] = setInterval(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  battalionRefs.current[`enemy-${battalion.nodeIndex}`]?.triggerAttackAnimation();
                  setTimeout(() => {
                    nodeRef.triggerDamageAnimation();
                    const damageApplied = nodeRef.applyDamage(totalDamage, false);
                    if (!damageApplied) {
                      clearInterval(attackIntervals.current[`enemy-${battalion.nodeIndex}-${targetNodeIndex}`]);
                      delete attackIntervals.current[`enemy-${battalion.nodeIndex}-${targetNodeIndex}`];
                    }
                  }, 100);
                }
              }, attackInterval);
            }, 150);
          }
        });

        anim.start();
      });

      return () => {
        // Clear all intervals and listeners on cleanup
        Object.values(attackIntervals.current).forEach(interval => clearInterval(interval));
        attackIntervals.current = {};
        userBattalions.forEach(battalion => battalion.position.removeAllListeners());
        enemyBattalions.forEach(battalion => battalion.position.removeAllListeners());
      };
    }
  }, [battleStarted, nodes, userBattalions, enemyBattalions]);

  // IMPORTANT: Handle finding new targets for battalions
  const findNewTarget = (battalion: BattalionPosition, isUser: boolean) => {
    const availableTargets = findAvailableTargets(battalion, isUser);
    if (availableTargets.length > 0) {
      const target = availableTargets[0];
      moveBattalionAlongPath(battalion, target.index, isUser);
    }
  };

  return {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
  };
}; 