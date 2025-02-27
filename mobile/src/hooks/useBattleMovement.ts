import { useCallback } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';

// Network topology for node connections
const NETWORK_CONNECTIONS = [
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
  [0, 4], [1, 3], [1, 5], [2, 4],
  [3, 7], [4, 6], [4, 8], [5, 7]
];

// Combat state management
const COMBAT_STATES = {
  IDLE: 'idle',
  MOVING: 'moving',
  ATTACKING: 'attacking',
  DESTROYED: 'destroyed'
} as const;

// Movement thresholds
const MOVEMENT_THRESHOLD = 0.5;
const POSITION_THRESHOLD = 0.1;

// Add state tracking at the top of the hook
const nodeCaptureLocks = new Set<number>();

// Add cooldown tracking at the top of the hook
const nodeCooldowns = new Map<number, number>();
const CAPTURE_COOLDOWN = 2000; // 2 seconds cooldown between captures

// IMPORTANT: Keep movement logic centralized in this hook
export const useBattleMovement = (
  nodes: BattleNode[],
  battalionRefs: React.MutableRefObject<{
    [key: string]: {
      triggerAttackAnimation: () => void;
      triggerDamageAnimation: () => void;
    } | null;
  }>,
  attackIntervals: React.MutableRefObject<{
    [key: string]: NodeJS.Timeout;
  }>,
  nodeRefs: React.MutableRefObject<{
    [key: string]: {
      triggerDamageAnimation: () => void;
      applyDamage: (damage: number, isUser: boolean) => boolean;
    } | null;
  }>,
  setUserBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
  setEnemyBattalions: React.Dispatch<React.SetStateAction<BattalionPosition[]>>,
) => {
  // Function type declarations
  type MoveBattalionFn = (
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ) => void;

  type SetupAttacksFn = (
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    battalionId: string,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ) => void;

  // Initialize with empty implementations
  let moveBattalionAlongPath: MoveBattalionFn = () => {};
  let setupAttacks: SetupAttacksFn = () => {};

  // Centralized health management
  const updateBattalionHealth = useCallback((
    battalion: BattalionPosition,
    newHealth: number,
    isUser: boolean
  ): boolean => {
    const healthPerUnit = BOT_CATEGORIES[battalion.type].stats.health;
    const oldHealth = battalion.currentHealth;
    battalion.currentHealth = Math.max(0, newHealth);
    battalion.quantity = Math.ceil(battalion.currentHealth / healthPerUnit);
    
    // Only log destruction events
    if (battalion.currentHealth <= 0 && oldHealth > 0) {
      const battalionId = `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`;
      console.log(`[Battle] ${battalionId} destroyed`);
      cleanupBattalion(battalionId);
      return true;
    }
    return false;
  }, []);

  // Cleanup protocol with enhanced validation
  const cleanupBattalion = useCallback((battalionId: string) => {
    // Clean up all intervals related to this battalion
    Object.keys(attackIntervals.current).forEach(key => {
      if (key.includes(battalionId)) {
        clearInterval(attackIntervals.current[key]);
        delete attackIntervals.current[key];
      }
    });
  }, []);

  // Get connected nodes following network topology
  const getConnectedNodes = useCallback((nodeIndex: number): number[] => {
    return NETWORK_CONNECTIONS
      .filter(([from, to]) => from === nodeIndex || to === nodeIndex)
      .map(([from, to]) => from === nodeIndex ? to : from);
  }, []);

  // Position calculation
  const getAnimatedPosition = useCallback((position: Animated.ValueXY) => {
    return {
      x: (position.x as any)._value || 0,
      y: (position.y as any)._value || 0
    };
  }, []);

  // Target finding with improved validation and coordination
  const findAvailableTargets = useCallback((
    battalion: BattalionPosition,
    isUser: boolean,
    userBattalions: BattalionPosition[],
    enemyBattalions: BattalionPosition[]
  ): BattleTarget[] => {
    if (battalion.quantity <= 0 || battalion.currentHealth <= 0) return [];
    
    const currentPos = getAnimatedPosition(battalion.position);
    const allTargets: BattleTarget[] = [];
    
    // Check neutral nodes first (primary targets)
    const connectedNodeIndices = getConnectedNodes(battalion.nodeIndex);
    nodes.forEach((node, index) => {
      if (!connectedNodeIndices.includes(index)) return;
      // Only target neutral nodes
      if (node.controlState !== 'neutral') return;
      if (index === battalion.nodeIndex) return;
      
      const distance = Math.sqrt(
        Math.pow(node.x - currentPos.x, 2) + 
        Math.pow(node.y - currentPos.y, 2)
      );
      
      if (!isNaN(distance)) {
        allTargets.push({
          type: 'node',
          index,
          distance,
          position: { x: node.x, y: node.y }
        });
      }
    });

    // If no neutral nodes found and not a guardian, check enemy battalions
    if (allTargets.length === 0 && battalion.type !== 'guardian') {
      const enemyBatts = isUser ? enemyBattalions : userBattalions;
      
      enemyBatts.forEach((enemyBattalion, index) => {
        if (!enemyBattalion || enemyBattalion.quantity <= 0 || enemyBattalion.currentHealth <= 0) return;
        
        const enemyPos = getAnimatedPosition(enemyBattalion.position);
        const distance = Math.sqrt(
          Math.pow(enemyPos.x - currentPos.x, 2) + 
          Math.pow(enemyPos.y - currentPos.y, 2)
        );
        
        if (!isNaN(distance)) {
          allTargets.push({
            type: 'battalion',
            index,
            distance,
            position: enemyPos
          });
        }
      });
    }
    
    // Sort targets by distance only - priority is handled by order of checking
    const validTargets = allTargets
      .filter(target => !isNaN(target.distance))
      .sort((a, b) => a.distance - b.distance);
    
    if (validTargets.length > 0) {
      const bestTarget = validTargets[0];
      battalion.targetNode = bestTarget.index;
      battalion.targetType = bestTarget.type;
      return [bestTarget];
    }
    
    battalion.targetNode = undefined;
    battalion.targetType = undefined;
    return [];
  }, [nodes, getConnectedNodes]);

  // Movement calculation
  const calculateMovementDuration = useCallback((
    startNode: BattleNode, 
    targetNode: BattleNode, 
    speedStat: number
  ) => {
    const dx = targetNode.x - startNode.x;
    const dy = targetNode.y - startNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseSpeed = 0.1;
    const speed = baseSpeed * (speedStat / 5);
    return distance / speed;
  }, []);

  // Movement with improved validation
  moveBattalionAlongPath = useCallback((
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ): void => {
    const battalionId = `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`;
    
    // Check if battalion is destroyed
    if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
      cleanupBattalion(battalionId);
      return;
    }

    // Validate node target before proceeding
    if (target.type === 'node') {
      const node = nodes[target.index];
      // Only retarget if node is not neutral (captured)
      if (node.controlState !== 'neutral') {
        if (__DEV__) {
          console.log(`[Battle] ${battalionId} skipping already captured node ${target.index} (${node.controlState})`);
        }
        battalion.targetNode = undefined;
        battalion.targetType = undefined;
        const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
        if (newTargets.length > 0) {
          // Prevent targeting the same node again
          const validTarget = newTargets.find(t => 
            t.type === 'node' ? nodes[t.index].controlState === 'neutral' : true
          );
          if (validTarget) {
            moveBattalionAlongPath(battalion, validTarget, isUser, userBattalions, enemyBattalions);
          } else if (__DEV__) {
            console.log(`[Battle] ${battalionId} no valid targets found`);
          }
        }
        return;
      }
    }

    if (!target || !target.position) return;
    
    const currentPos = getAnimatedPosition(battalion.position);
    const dx = target.position.x - currentPos.x;
    const dy = target.position.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (isNaN(distance) || distance === 0) return;

    const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
    const directionX = dx / distance;
    const directionY = dy / distance;
    const moveDistance = Math.max(0, distance - range);
    
    // If in range, start attacking
    if (moveDistance < MOVEMENT_THRESHOLD && Math.abs(dx) < POSITION_THRESHOLD && Math.abs(dy) < POSITION_THRESHOLD) {
      setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      return;
    }

    const rangePosition = {
      x: currentPos.x + (directionX * moveDistance),
      y: currentPos.y + (directionY * moveDistance)
    };
    
    cleanupBattalion(battalionId);

    const speed = BOT_CATEGORIES[battalion.type].stats.speed;
    const movementDuration = (moveDistance / speed) * 70;
    
    Animated.timing(battalion.position, {
      toValue: rangePosition,
      duration: movementDuration,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (!finished) return;
      
      // Check if battalion was destroyed during movement
      if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
        cleanupBattalion(battalionId);
        return;
      }

      if (target.type === 'node') {
        const node = nodes[target.index];
        // Only retarget if node is not neutral (captured)
        if (node.controlState !== 'neutral') {
          if (__DEV__) {
            console.log(`[Battle] ${battalionId} skipping already captured node ${target.index} (${node.controlState})`);
          }
          battalion.targetNode = undefined;
          battalion.targetType = undefined;
          const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
          if (newTargets.length > 0) {
            // Prevent targeting the same node again
            const validTarget = newTargets.find(t => 
              t.type === 'node' ? nodes[t.index].controlState === 'neutral' : true
            );
            if (validTarget) {
              moveBattalionAlongPath(battalion, validTarget, isUser, userBattalions, enemyBattalions);
            } else if (__DEV__) {
              console.log(`[Battle] ${battalionId} no valid targets found`);
            }
          }
          return;
        }
        // Continue attacking neutral node
        setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      } else if (target.type === 'battalion') {
        const enemyBatts = isUser ? enemyBattalions : userBattalions;
        const enemyBattalion = enemyBatts![target.index];
        
        // Check if target battalion was destroyed
        if (!enemyBattalion || enemyBattalion.quantity <= 0 || enemyBattalion.currentHealth <= 0) {
          if (__DEV__) {
            console.log(`[Battle] Retargeting from destroyed battalion ${target.index}`);
          }
          battalion.targetNode = undefined;
          battalion.targetType = undefined;
          const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
          if (newTargets.length > 0) {
            moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
          }
          return;
        }

        const enemyPos = getAnimatedPosition(enemyBattalion.position);
        const currentDistance = Math.sqrt(
          Math.pow(enemyPos.x - currentPos.x, 2) + 
          Math.pow(enemyPos.y - currentPos.y, 2)
        );
        
        // Check if target is in range
        if (currentDistance <= range) {
          setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
        } else {
          // Target moved, follow it
          moveBattalionAlongPath(battalion, { ...target, position: enemyPos }, isUser, userBattalions, enemyBattalions);
        }
      }
    });
  }, [nodes, cleanupBattalion, findAvailableTargets, setupAttacks]);

  // Setup attacks with improved cleanup and node capture handling
  setupAttacks = useCallback((
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    battalionId: string,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ): void => {
    if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
      cleanupBattalion(battalionId);
      return;
    }

    const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
    const attackInterval = 2000 * (5 / attackSpeed);
    const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
    const totalDamage = attackPower * battalion.quantity;
    
    cleanupBattalion(battalionId);

    setTimeout(() => {
      if (target.type === 'node') {
        const nodeRef = nodeRefs.current[target.index];
        if (!nodeRef || battalion.quantity <= 0 || battalion.currentHealth <= 0) {
          cleanupBattalion(battalionId);
          return;
        }

        // Set up recurring attacks
        const intervalKey = `${battalionId}-node-${target.index}`;
        const attackFn = () => {
          if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
            cleanupBattalion(battalionId);
            return;
          }

          const node = nodes[target.index];
          // Only retarget if node is not neutral (captured)
          if (node.controlState !== 'neutral') {
            if (__DEV__) {
              console.log(`[Battle] ${battalionId} retargeting from captured node ${target.index} (${node.controlState})`);
            }
            cleanupBattalion(battalionId);
            battalion.targetNode = undefined;
            battalion.targetType = undefined;
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
            if (newTargets.length > 0) {
              moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
            }
            return;
          }

          // Apply damage
          const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
          if (!damageApplied) {
            if (__DEV__) {
              console.log(`[Battle] ${battalionId} retargeting - node ${target.index} captured by ${isUser ? 'user' : 'enemy'}`);
            }
            cleanupBattalion(battalionId);
            battalion.targetNode = undefined;
            battalion.targetType = undefined;
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
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
          if (__DEV__) {
            console.log(`[Battle] Target battalion destroyed, finding new target`);
          }
          const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
          if (newTargets.length > 0) {
            moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
          }
          return;
        }

        const enemyId = `${!isUser ? 'user' : 'enemy'}-${enemyBattalion.type}-${enemyBattalion.nodeIndex}`;
        const intervalKey = `${battalionId}-${enemyId}`;
        
        const attackFn = () => {
          if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
            cleanupBattalion(battalionId);
            return;
          }

          const updateStateFn = (prevBatts: BattalionPosition[]) => {
            const updatedBatts = [...prevBatts];
            const targetBatt = updatedBatts[target.index];
            
            if (!targetBatt || targetBatt.quantity <= 0 || targetBatt.currentHealth <= 0) {
              cleanupBattalion(battalionId);
              return prevBatts;
            }

            const wasDestroyed = updateBattalionHealth(targetBatt, targetBatt.currentHealth - totalDamage, !isUser);
            
            // Schedule retargeting if target was destroyed
            if (wasDestroyed) {
              if (__DEV__) {
                console.log(`[Battle] ${battalionId} retargeting - target battalion ${enemyId} destroyed during combat`);
              }
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
  }, [cleanupBattalion, findAvailableTargets, moveBattalionAlongPath, updateBattalionHealth]);

  const findNewTarget = (battalion: BattalionPosition, isUser: boolean) => {
    const battalionId = `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`;
    if (__DEV__) {
      console.log(`[Battle] ${battalionId} searching for new target - previous target ${battalion.targetType === 'node' ? `node ${battalion.targetNode}` : battalion.targetType === 'battalion' ? 'battalion' : 'none'}`);
    }
    
    setUserBattalions(userBatts => {
      setEnemyBattalions(enemyBatts => {
        const targets = findAvailableTargets(
          battalion,
          isUser,
          userBatts,
          enemyBatts
        );
        
        if (targets.length > 0) {
          const target = targets[0];
          if (__DEV__) {
            console.log(`[Battle] ${battalionId} selected new target: ${target.type} ${target.index}`);
          }
          moveBattalionAlongPath(
            battalion,
            target,
            isUser,
            userBatts,
            enemyBatts
          );
        } else if (__DEV__) {
          console.log(`[Battle] ${battalionId} found no valid targets`);
        }
        return enemyBatts;
      });
      return userBatts;
    });
  };

  return {
    getAnimatedPosition,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath,
    findNewTarget
  };
}; 