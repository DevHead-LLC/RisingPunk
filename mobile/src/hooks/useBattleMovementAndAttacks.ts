import { useEffect, useRef, useState } from 'react';
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
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
) => {
  // IMPORTANT: Keep refs for animations and intervals
  const battalionRefs = useRef<BattalionRefs>({});
  const attackIntervals = useRef<AttackIntervals>({});
  const nodeRefs = useRef<NodeRefs>({});
  const battleInitializedRef = useRef(false);
  const battalionsRef = useRef({ user: userBattalions, enemy: enemyBattalions });
  const nodesRef = useRef(nodes);

  const {
    getAnimatedPosition,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath
  } = useBattleMovement(nodes, battalionRefs, attackIntervals, nodeRefs, setUserBattalions, setEnemyBattalions);

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
      if (__DEV__) {
        // Log initial battle setup once at the start
        console.log('[Battle] Starting battle');
      }

      // Base duration for slowest speed (speed stat of 5)
      const BASE_DURATION = 5000; // 3 seconds for base movement
      
      // Handle user battalions
      const targetedNodes = new Set<number>();
      
      // Sort battalions by type to prioritize targeting
      const sortedBattalions = [...battalionsRef.current.user].sort((a, b) => {
        // Prioritize guardians for node control, then breachers, then phreaks
        const typeOrder = { guardian: 0, breacher: 1, phreak: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      sortedBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 0: availableNodes = [3, 4]; break;
          case 1: availableNodes = [3, 4, 5]; break;
          case 2: availableNodes = [4, 5]; break;
        }
        
        // Filter out already targeted nodes unless it's a guardian supporting another unit
        availableNodes = availableNodes.filter(nodeIndex => {
          if (battalion.type === 'guardian') return true;
          return !targetedNodes.has(nodeIndex);
        });

        // If no untargeted nodes available, expand search
        if (availableNodes.length === 0) {
          switch (battalion.nodeIndex) {
            case 0: availableNodes = [3, 4]; break;
            case 1: availableNodes = [3, 4, 5]; break;
            case 2: availableNodes = [4, 5]; break;
          }
        }

        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        targetedNodes.add(targetNodeIndex);

        if (__DEV__) {
          // Only log initial targeting
          console.log(`[Battle] ${battalion.type} targeting node ${targetNodeIndex}`);
        }
        const targetNode = nodesRef.current[targetNodeIndex];
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
            // Remove redundant attack range logging
            anim.stop();
            battalion.position.removeListener(listener);
            
            // Clear any existing attack interval
            const existingKey = `user-${battalion.nodeIndex}-${targetNodeIndex}`;
            if (attackIntervals.current[existingKey]) {
              clearInterval(attackIntervals.current[existingKey]);
            }

            // Set up new attack interval
            const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
            const attackInterval = 2000 * (5 / attackSpeed);
            
            setTimeout(() => {
              battalionRefs.current[`user-${battalion.nodeIndex}`]?.triggerAttackAnimation();
              
              const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
              const totalDamage = attackPower * battalion.quantity;
              
              setTimeout(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  nodeRef.triggerDamageAnimation();
                  const damageApplied = nodeRef.applyDamage(totalDamage, true);
                  if (!damageApplied) {
                    if (__DEV__) {
                      // Log only when target is destroyed/captured
                      console.log(`[Battle] Target node ${targetNodeIndex} captured/destroyed`);
                    }
                    // Node was captured or destroyed, find new target
                    const newTargets = findAvailableTargets(battalion, true, battalionsRef.current.user, battalionsRef.current.enemy);
                    if (newTargets.length > 0) {
                      moveBattalionAlongPath(battalion, newTargets[0], true, battalionsRef.current.user, battalionsRef.current.enemy);
                    }
                    clearInterval(attackIntervals.current[existingKey]);
                    delete attackIntervals.current[existingKey];
                  }
                }
              }, 100);
              
              attackIntervals.current[existingKey] = setInterval(() => {
                // Remove verbose attack logging
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  battalionRefs.current[`user-${battalion.nodeIndex}`]?.triggerAttackAnimation();
                  setTimeout(() => {
                    nodeRef.triggerDamageAnimation();
                    const damageApplied = nodeRef.applyDamage(totalDamage, true);
                    if (!damageApplied) {
                      // Node was captured or destroyed, find new target
                      const newTargets = findAvailableTargets(battalion, true, battalionsRef.current.user, battalionsRef.current.enemy);
                      if (newTargets.length > 0) {
                        moveBattalionAlongPath(battalion, newTargets[0], true, battalionsRef.current.user, battalionsRef.current.enemy);
                      }
                      clearInterval(attackIntervals.current[existingKey]);
                      delete attackIntervals.current[existingKey];
                    }
                  }, 100);
                }
              }, attackInterval);

              // Remove interval logging
            }, 150);
          }
        });

        anim.start();
      });

      // Handle enemy battalions with similar logic
      const enemyTargetedNodes = new Set<number>();
      
      // Sort enemy battalions by type to prioritize targeting
      const sortedEnemyBattalions = [...battalionsRef.current.enemy].sort((a, b) => {
        const typeOrder = { guardian: 0, breacher: 1, phreak: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      sortedEnemyBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 6: availableNodes = [3, 4]; break;
          case 7: availableNodes = [3, 4, 5]; break;
          case 8: availableNodes = [4, 5]; break;
        }
        
        // Filter out already targeted nodes unless it's a guardian supporting another unit
        availableNodes = availableNodes.filter(nodeIndex => {
          if (battalion.type === 'guardian') return true;
          return !enemyTargetedNodes.has(nodeIndex);
        });

        // If no untargeted nodes available, expand search
        if (availableNodes.length === 0) {
          switch (battalion.nodeIndex) {
            case 6: availableNodes = [3, 4]; break;
            case 7: availableNodes = [3, 4, 5]; break;
            case 8: availableNodes = [4, 5]; break;
          }
        }

        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        enemyTargetedNodes.add(targetNodeIndex);

        if (__DEV__) {
          console.log(`[Battle] enemy-${battalion.type}-${battalion.nodeIndex} targeting node ${targetNodeIndex}`);
        }
        const targetNode = nodesRef.current[targetNodeIndex];
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
            
            const existingKey = `enemy-${battalion.nodeIndex}-${targetNodeIndex}`;
            if (attackIntervals.current[existingKey]) {
              clearInterval(attackIntervals.current[existingKey]);
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
                    // Node was captured or destroyed, find new target
                    const newTargets = findAvailableTargets(battalion, false, battalionsRef.current.user, battalionsRef.current.enemy);
                    if (newTargets.length > 0) {
                      moveBattalionAlongPath(battalion, newTargets[0], false, battalionsRef.current.user, battalionsRef.current.enemy);
                    }
                    clearInterval(attackIntervals.current[existingKey]);
                    delete attackIntervals.current[existingKey];
                  }
                }
              }, 100);
              
              attackIntervals.current[existingKey] = setInterval(() => {
                const nodeRef = nodeRefs.current[targetNodeIndex];
                if (nodeRef) {
                  battalionRefs.current[`enemy-${battalion.nodeIndex}`]?.triggerAttackAnimation();
                  setTimeout(() => {
                    nodeRef.triggerDamageAnimation();
                    const damageApplied = nodeRef.applyDamage(totalDamage, false);
                    if (!damageApplied) {
                      // Node was captured or destroyed, find new target
                      const newTargets = findAvailableTargets(battalion, false, battalionsRef.current.user, battalionsRef.current.enemy);
                      if (newTargets.length > 0) {
                        moveBattalionAlongPath(battalion, newTargets[0], false, battalionsRef.current.user, battalionsRef.current.enemy);
                      }
                      clearInterval(attackIntervals.current[existingKey]);
                      delete attackIntervals.current[existingKey];
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
        Object.values(attackIntervals.current).forEach(interval => clearInterval(interval));
        attackIntervals.current = {};
        battalionsRef.current.user.forEach(battalion => battalion.position.removeAllListeners());
        battalionsRef.current.enemy.forEach(battalion => battalion.position.removeAllListeners());
        battleInitializedRef.current = false;
      };
    }
  }, [battleStarted]); // Only depend on battleStarted

  // IMPORTANT: Handle finding new targets for battalions
  const findNewTarget = (battalion: BattalionPosition, isUser: boolean) => {
    if (__DEV__) {
      console.log(`[Retarget] Finding new target for ${isUser ? 'user' : 'enemy'} battalion at node ${battalion.nodeIndex}`);
    }
    
    const targets = findAvailableTargets(
      battalion,
      isUser,
      battalionsRef.current.user,
      battalionsRef.current.enemy
    );
    
    if (targets.length > 0) {
      const target = targets[0];
      if (__DEV__) {
        console.log(`[Retarget] Moving battalion to ${target.type} ${target.index}`);
      }
      moveBattalionAlongPath(
        battalion,
        target,
        isUser,
        battalionsRef.current.user,
        battalionsRef.current.enemy
      );
    } else {
      console.log(`[Retarget] No valid targets found for battalion at node ${battalion.nodeIndex}`);
    }
  };

  return {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
  };
}; 