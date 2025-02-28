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

type OnBattalionLoss = (
  side: 'user' | 'enemy',
  battalionId: string,
  quantity: number,
  mark: number
) => void;

// IMPORTANT: This hook manages all battalion movement and attack logic
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
  const RETARGET_COOLDOWN = 1000; // 1 second cooldown
  const recentlyCapturedNodes = useRef<Set<number>>(new Set());
  const CAPTURE_MEMORY_DURATION = 2000; // 2 seconds memory

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

        const listener = battalion.position.addListener(({ x, y }: { x: number; y: number }) => {
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

        const enemyListener = battalion.position.addListener(({ x, y }: { x: number; y: number }) => {
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

  const handleBattalionDamage = (
    battalion: BattalionPosition,
    damage: number,
    isUser: boolean
  ) => {
    const healthPerBot = BOT_CATEGORIES[battalion.type].stats.health;
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

      if (__DEV__) {
        console.log(`[Battle] ${isUser ? 'User' : 'Enemy'} battalion ${battalion.type}-${battalion.nodeIndex} lost ${botsLost} units`);
      }

      return newQuantity === 0; // Return true if battalion is destroyed
    }
    return false;
  };

  // Update the attack logic to use handleBattalionDamage
  const setupAttacks = (
    battalion: BattalionPosition,
    targetBattalion: BattalionPosition,
    isUser: boolean
  ) => {
    const attackerKey = `${isUser ? 'user' : 'enemy'}-${battalion.nodeIndex}`;
    const targetKey = `${isUser ? 'enemy' : 'user'}-${targetBattalion.nodeIndex}`;
    const intervalKey = `${attackerKey}-${targetBattalion.nodeIndex}`;

    // Clear any existing attack interval
    if (attackIntervals.current[intervalKey]) {
      clearInterval(attackIntervals.current[intervalKey]);
    }

    const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
    const attackInterval = 2000 * (5 / attackSpeed);
    const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
    const totalDamage = attackPower * battalion.quantity;

    const performAttack = () => {
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
      }, 100);
    };

    // Initial attack
    performAttack();
    
    // Set up interval for subsequent attacks
    attackIntervals.current[intervalKey] = setInterval(performAttack, attackInterval);
  };

  // Update findNewTarget to be more strategic
  const findNewTarget = (battalion: BattalionPosition, isUser: boolean) => {
    const battalionId = `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`;
    
    // Check cooldown
    const now = Date.now();
    const lastRetarget = retargetCooldowns.current[battalionId] || 0;
    if (now - lastRetarget < RETARGET_COOLDOWN) {
      return; // Still in cooldown
    }
    
    if (__DEV__) {
      console.log(`[Retarget] Finding new target for ${isUser ? 'user' : 'enemy'} battalion at node ${battalion.nodeIndex}`);
    }
    
    // First try to find neutral nodes
    let targets = findAvailableTargets(
      battalion,
      isUser,
      battalionsRef.current.user,
      battalionsRef.current.enemy
    ).filter(target => {
      if (target.type === 'node') {
        const node = nodesRef.current[target.index];
        // For guardians, stay at captured nodes to defend them
        if (battalion.type === 'guardian') {
          const isOurNode = (isUser && node.controlState === 'user') || (!isUser && node.controlState === 'enemy');
          // Stay at current node if we control it
          if (isOurNode && target.index === battalion.nodeIndex) {
            return true;
          }
          // Only target neutral nodes, never try to recapture nodes
          return node.controlState === 'neutral';
        }
        // For other types, only target neutral nodes that aren't recently captured
        return node.controlState === 'neutral' && !recentlyCapturedNodes.current.has(target.index);
      }
      return false; // Initially only look for nodes
    });

    // If no neutral nodes found, then consider enemy battalions (if not a guardian)
    if (targets.length === 0 && battalion.type !== 'guardian') {
      // For non-guardians, if no neutral nodes, attack enemy battalions
      targets = findAvailableTargets(
        battalion,
        isUser,
        battalionsRef.current.user,
        battalionsRef.current.enemy
      ).filter(target => target.type === 'battalion');
    } else if (targets.length === 0 && battalion.type === 'guardian') {
      // For guardians with no targets, find the nearest controlled node to defend
      targets = findAvailableTargets(
        battalion,
        isUser,
        battalionsRef.current.user,
        battalionsRef.current.enemy
      ).filter(target => {
        if (target.type === 'node') {
          const node = nodesRef.current[target.index];
          return (isUser && node.controlState === 'user') || (!isUser && node.controlState === 'enemy');
        }
        return false;
      });
    }
    
    if (targets.length > 0) {
      const target = targets[0];
      if (__DEV__) {
        console.log(`[Retarget] Moving battalion to ${target.type} ${target.index}`);
      }
      
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
    } else if (__DEV__) {
      console.log(`[Retarget] No valid targets found for battalion at node ${battalion.nodeIndex}`);
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