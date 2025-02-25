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
  // Get connected nodes following network topology
  const getConnectedNodes = useCallback((nodeIndex: number): number[] => {
    const connected = NETWORK_CONNECTIONS
      .filter(([from, to]) => from === nodeIndex || to === nodeIndex)
      .map(([from, to]) => from === nodeIndex ? to : from);
    
    console.log(`[Network] Node ${nodeIndex} is connected to nodes:`, connected);
    return connected;
  }, []);

  // IMPORTANT: Keep position calculation separate from movement logic
  const getAnimatedPosition = useCallback((position: Animated.ValueXY) => {
    return {
      x: (position.x as any)._value || 0,
      y: (position.y as any)._value || 0
    };
  }, []);

  // IMPORTANT: Keep target finding logic isolated
  const findAvailableTargets = useCallback((
    battalion: BattalionPosition,
    isUser: boolean,
    userBattalions: BattalionPosition[],
    enemyBattalions: BattalionPosition[]
  ): BattleTarget[] => {
    const battalionId = `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`;
    console.log(`[Retarget] Battalion ${battalionId} at node ${battalion.nodeIndex} (${battalion.type}) searching for new target`);
    
    const currentPos = getAnimatedPosition(battalion.position);
    const allTargets: BattleTarget[] = [];
    
    // First check for enemy battalions
    const enemyBatts = isUser ? enemyBattalions : userBattalions;
    enemyBatts.forEach((enemyBattalion, index) => {
      if (!enemyBattalion || enemyBattalion.quantity <= 0) {
        console.log(`[Retarget] ${battalionId}: Enemy battalion ${index} rejected - defeated`);
        return;
      }
      
      const enemyPos = getAnimatedPosition(enemyBattalion.position);
      const enemyId = `${!isUser ? 'user' : 'enemy'}-${enemyBattalion.type}-${enemyBattalion.nodeIndex}`;
      
      const distance = Math.sqrt(
        Math.pow(enemyPos.x - currentPos.x, 2) + 
        Math.pow(enemyPos.y - currentPos.y, 2)
      );
      
      if (!isNaN(distance)) {
        const target: BattleTarget = {
          type: 'battalion',
          index,
          distance,
          position: enemyPos
        };
        allTargets.push(target);
        console.log(`[Retarget] ${battalionId}: Added enemy ${enemyId} as target at distance ${distance.toFixed(2)}`);
      }
    });

    // Only check for neutral nodes if no enemy battalions are in range
    if (allTargets.length === 0) {
      const connectedNodeIndices = getConnectedNodes(battalion.nodeIndex);
      nodes.forEach((node, index) => {
        if (!connectedNodeIndices.includes(index)) {
          console.log(`[Retarget] ${battalionId}: Node ${index} rejected - not connected to current position`);
          return;
        }
        
        if (nodes[index].controlState === (isUser ? 'user' : 'enemy')) {
          console.log(`[Retarget] ${battalionId}: Node ${index} rejected - already controlled`);
          return;
        }

        if (nodes[index].controlState === (!isUser ? 'user' : 'enemy')) {
          console.log(`[Retarget] ${battalionId}: Node ${index} rejected - enemy controlled`);
          return;
        }
        
        const distance = Math.sqrt(
          Math.pow(node.x - currentPos.x, 2) + 
          Math.pow(node.y - currentPos.y, 2)
        );
        
        if (!isNaN(distance)) {
          const target: BattleTarget = {
            type: 'node',
            index,
            distance,
            position: { x: node.x, y: node.y }
          };
          allTargets.push(target);
          console.log(`[Retarget] ${battalionId}: Found neutral node ${index} at distance ${distance.toFixed(2)}`);
        }
      });
    }
    
    // Sort by distance and select nearest target
    const validTargets = allTargets
      .filter(target => !isNaN(target.distance))
      .sort((a, b) => a.distance - b.distance);
    
    if (validTargets.length > 0) {
      const nearestTarget = validTargets[0];
      console.log(`[Retarget] ${battalionId}: Selected nearest target - ${nearestTarget.type} ${nearestTarget.index} at distance ${nearestTarget.distance.toFixed(2)}`);
      
      // Update battalion's target info
      battalion.targetNode = nearestTarget.index;
      battalion.targetType = nearestTarget.type;
      
      return [nearestTarget];
    }
    
    console.log(`[Retarget] ${battalionId}: No valid targets found - battle should end`);
    battalion.targetNode = undefined;
    battalion.targetType = undefined;
    return [];
  }, [nodes, getConnectedNodes]);

  // IMPORTANT: Keep movement calculation separate
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

  // IMPORTANT: Keep path movement logic centralized
  const moveBattalionAlongPath = useCallback((
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ) => {
    const battalionId = `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`;
    
    if (!target || !target.position) {
      console.log(`[Movement] ${battalionId} ERROR: Invalid target or target position`, target);
      return;
    }
    
    console.log(`[Movement] ${battalionId} initiating movement to ${target.type} ${target.index}`);
    
    const currentPos = getAnimatedPosition(battalion.position);
    
    // Calculate movement vector
    const dx = target.position.x - currentPos.x;
    const dy = target.position.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (isNaN(distance) || distance === 0) {
      console.log(`[Movement] ${battalionId} ERROR: Invalid distance calculation`, { dx, dy, distance });
      return;
    }

    // Calculate range and movement distance
    const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
    const directionX = dx / distance;
    const directionY = dy / distance;
    
    // For both nodes and battalions, move until we're at attack range
    const moveDistance = Math.max(0, distance - range);
    
    // ADDED: If moveDistance is 0 and we're already at the target position, don't attempt movement
    if (moveDistance === 0 && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      console.log(`[Movement] ${battalionId} already at optimal position, skipping movement`);
      
      // Set up attacks immediately since we're already in position
      if (battalion.quantity <= 0) {
        console.log(`[Combat] ${battalionId} is defeated, cannot initiate combat`);
        return;
      }

      if (target.type === 'battalion') {
        const enemyBatts = isUser ? enemyBattalions : userBattalions;
        const enemyBattalion = enemyBatts![target.index];
        if (!enemyBattalion || enemyBattalion.quantity <= 0) {
          console.log(`[Combat] ${battalionId}: Target battalion ${target.index} no longer valid, finding new target`);
          const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
          if (newTargets.length > 0) {
            console.log(`[Retarget] ${battalionId} found new target: ${newTargets[0].type} ${newTargets[0].index}`);
            moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
          }
          return;
        }
        console.log(`[Combat] ${battalionId} in range of target battalion ${target.index}, initiating combat`);
        setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      }
      return;
    }

    const rangePosition = {
      x: currentPos.x + (directionX * moveDistance),
      y: currentPos.y + (directionY * moveDistance)
    };
    
    console.log(`[Movement] ${battalionId} will move to range position: x=${rangePosition.x.toFixed(2)}, y=${rangePosition.y.toFixed(2)} (${target.type} target, range=${range}, moveDistance=${moveDistance.toFixed(2)})`);

    // Clear any existing attack intervals for this battalion
    Object.keys(attackIntervals.current).forEach(key => {
      if (key.startsWith(`${battalionId}-`)) {
        clearInterval(attackIntervals.current[key]);
        delete attackIntervals.current[key];
      }
    });

    // Calculate movement duration based on distance to travel
    const speed = BOT_CATEGORIES[battalion.type].stats.speed;
    const movementDuration = (moveDistance / speed) * 70;
    
    // Start movement animation
    Animated.timing(battalion.position, {
      toValue: rangePosition,
      duration: movementDuration,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        console.log(`[Movement] ${battalionId} reached target position for ${target.type} ${target.index}`);
        
        // Don't set up attacks if this battalion is defeated
        if (battalion.quantity <= 0) {
          console.log(`[Combat] ${battalionId} is defeated, cannot initiate combat`);
          return;
        }

        // For nodes, verify target is still valid and set up attacks
        if (target.type === 'node') {
          const node = nodes[target.index];
          console.log(`[Node Status] Node ${target.index} control state: ${node.controlState}`);
          
          if (node.controlState !== 'neutral') {
            console.log(`[Node Status] Node ${target.index} is no longer neutral`);
            console.log(`[Retarget] ${battalionId} searching for new target due to node ${target.index} being captured`);
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
            if (newTargets.length > 0) {
              console.log(`[Retarget] ${battalionId} found new target: ${newTargets[0].type} ${newTargets[0].index}`);
              moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
            } else {
              console.log(`[Combat End] ${battalionId} found no valid targets, battle may be over`);
            }
            return;
          }
          console.log(`[Node Combat] ${battalionId} setting up attacks on neutral node ${target.index}`);
          setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
        } else if (target.type === 'battalion') {
          // For battalions, check if target is still valid and in range
          const enemyBatts = isUser ? enemyBattalions : userBattalions;
          const enemyBattalion = enemyBatts![target.index];
          
          if (!enemyBattalion || enemyBattalion.quantity <= 0) {
            console.log(`[Combat] ${battalionId}: Target battalion ${target.index} no longer valid, finding new target`);
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
            if (newTargets.length > 0) {
              console.log(`[Retarget] ${battalionId} found new target: ${newTargets[0].type} ${newTargets[0].index}`);
              moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
            }
            return;
          }

          // Calculate current distance to target
          const enemyPos = getAnimatedPosition(enemyBattalion.position);
          const distance = Math.sqrt(
            Math.pow(enemyPos.x - currentPos.x, 2) + 
            Math.pow(enemyPos.y - currentPos.y, 2)
          );
          
          const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
          if (distance <= range) {
            console.log(`[Combat] ${battalionId} in range of target battalion ${target.index}, initiating combat`);
            setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
          } else {
            console.log(`[Combat] ${battalionId} not in range of target battalion ${target.index}, adjusting position`);
            const newTarget = { ...target, position: enemyPos };
            moveBattalionAlongPath(battalion, newTarget, isUser, userBattalions, enemyBattalions);
          }
        }
      }
    });
  }, [nodes]);

  // Helper function to set up attacks
  const setupAttacks = (
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    battalionId: string,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ) => {
    // Early exit if battalion is already destroyed
    if (battalion.quantity <= 0) {
      console.log(`[Combat Setup] ${battalionId} is destroyed, cannot setup attacks`);
      return;
    }

    const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
    const attackInterval = 2000 * (5 / attackSpeed);
    console.log(`[Attack] ${battalionId} setting up attacks every ${attackInterval}ms`);
    
    // Clear any existing intervals for this battalion
    Object.keys(attackIntervals.current).forEach(key => {
      if (key.startsWith(battalionId)) {
        console.log(`[Combat Setup] Clearing existing interval ${key}`);
        clearInterval(attackIntervals.current[key]);
        delete attackIntervals.current[key];
      }
    });

    setTimeout(() => {
      const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
      const totalDamage = attackPower * battalion.quantity;
      console.log(`[Attack] ${battalionId} preparing to deal ${totalDamage} damage`);
      
      if (target.type === 'node') {
        const nodeRef = nodeRefs.current[target.index];
        if (nodeRef) {
          console.log(`[Node Combat] ${battalionId} initiating attack on node ${target.index}`);
          console.log(`[Node Combat] Attack power: ${totalDamage}`);
          battalionRefs.current[battalionId]?.triggerAttackAnimation();
          
          // Initial attack
          setTimeout(() => {
            nodeRef.triggerDamageAnimation();
            console.log(`[Node Combat] Applying initial damage of ${totalDamage} to node ${target.index}`);
            const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
            if (damageApplied) {
              console.log(`[Node Combat] Initial damage successfully applied to node ${target.index}`);
            } else {
              console.log(`[Node Combat] Failed to apply initial damage to node ${target.index}`);
            }
          }, 100);

          // Recurring attacks
          const intervalKey = `${battalionId}-${target.index}`;
          console.log(`[Node Combat] Setting up recurring attacks for ${battalionId} on node ${target.index}`);
          attackIntervals.current[intervalKey] = setInterval(() => {
            console.log(`[Node Combat] ${battalionId} executing recurring attack on node ${target.index}`);
            battalionRefs.current[battalionId]?.triggerAttackAnimation();
            
            setTimeout(() => {
              nodeRef.triggerDamageAnimation();
              console.log(`[Node Combat] Attempting to apply ${totalDamage} damage to node ${target.index}`);
              const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
              if (!damageApplied) {
                console.log(`[Node Combat] Node ${target.index} no longer valid target, clearing interval`);
                clearInterval(attackIntervals.current[intervalKey]);
                delete attackIntervals.current[intervalKey];
                
                // Retarget the battalion
                console.log(`[Node Combat] Finding new target for ${battalionId}`);
                const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
                if (newTargets.length > 0) {
                  console.log(`[Node Combat] New target found for ${battalionId}, initiating movement`);
                  moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
                }
              }
            }, 100);
          }, attackInterval);
        }
      } else if (target.type === 'battalion') {
        // Battalion vs battalion combat
        const enemyBatts = isUser ? enemyBattalions : userBattalions;
        if (!enemyBatts || !enemyBatts[target.index]) {
          console.log(`[Combat Error] ${battalionId}: Enemy battalion ${target.index} not found`);
          return;
        }

        const enemyBattalion = enemyBatts[target.index];
        const enemyId = `${!isUser ? 'user' : 'enemy'}-${enemyBattalion.type}-${enemyBattalion.nodeIndex}`;
        
        // Verify both battalions are still alive before starting combat
        if (battalion.quantity <= 0 || enemyBattalion.quantity <= 0) {
          console.log(`[Combat Setup] One or both battalions destroyed, cannot start combat`);
          return;
        }

        console.log(`\n[Combat Start] ====== Battle between ${battalionId} and ${enemyId} ======`);
        console.log(`[Combat Stats] Attacker: ${battalionId}`);
        console.log(`  Type: ${battalion.type}`);
        console.log(`  Quantity: ${battalion.quantity}`);
        console.log(`  Attack Power: ${BOT_CATEGORIES[battalion.type].stats.offense}`);
        console.log(`[Combat Stats] Defender: ${enemyId}`);
        console.log(`  Type: ${enemyBattalion.type}`);
        console.log(`  Quantity: ${enemyBattalion.quantity}`);
        console.log(`  Health Per Unit: ${BOT_CATEGORIES[enemyBattalion.type].stats.health}`);
        
        // Calculate max health based on type and quantity
        if (typeof enemyBattalion.currentHealth === 'undefined') {
          const healthPerUnit = BOT_CATEGORIES[enemyBattalion.type].stats.health;
          enemyBattalion.currentHealth = healthPerUnit * enemyBattalion.quantity;
          console.log(`[Health Init] ${enemyId} initial health calculated: ${enemyBattalion.currentHealth} (${healthPerUnit} per unit * ${enemyBattalion.quantity} units)`);
        }
        
        // Initial attack
        battalionRefs.current[battalionId]?.triggerAttackAnimation();
        
        setTimeout(() => {
          // Verify target is still alive before applying damage
          const targetBatts = isUser ? enemyBattalions : userBattalions;
          if (!targetBatts || targetBatts[target.index].quantity <= 0) {
            console.log(`[Combat] ${enemyId} already destroyed, skipping damage`);
            return;
          }

          battalionRefs.current[enemyId]?.triggerDamageAnimation();
          
          // Apply damage using the latest health value
          if (isUser) {
            setEnemyBattalions(prevBatts => {
              const latestHealth = prevBatts[target.index].currentHealth;
              if (latestHealth <= 0) {
                console.log(`[Combat] ${enemyId} already at 0 health, skipping damage`);
                return prevBatts;
              }

              const healthPerUnit = BOT_CATEGORIES[enemyBattalion.type].stats.health;
              const newHealth = Math.max(0, latestHealth - totalDamage);
              const newQuantity = Math.ceil(newHealth / healthPerUnit);
              
              console.log(`[Battle Damage] ${battalionId} dealing ${totalDamage} damage to ${enemyId}. Health: ${latestHealth} -> ${newHealth}`);

              const updatedBatts = prevBatts.map((batt, idx) => {
                if (idx === target.index) {
                  return {
                    ...batt,
                    currentHealth: newHealth,
                    quantity: newQuantity
                  };
                }
                return batt;
              });

              // If battalion is destroyed, clear all its attack intervals
              if (newHealth <= 0) {
                console.log(`[Battalion Destroyed] ${enemyId} has been destroyed`);
                Object.keys(attackIntervals.current).forEach(key => {
                  if (key.includes(enemyId)) {
                    console.log(`[Combat End] Clearing attack interval ${key}`);
                    clearInterval(attackIntervals.current[key]);
                    delete attackIntervals.current[key];
                  }
                });
              }
              
              return updatedBatts;
            });
          } else {
            setUserBattalions(prevBatts => {
              const latestHealth = prevBatts[target.index].currentHealth;
              if (latestHealth <= 0) {
                console.log(`[Combat] ${enemyId} already at 0 health, skipping damage`);
                return prevBatts;
              }

              const healthPerUnit = BOT_CATEGORIES[enemyBattalion.type].stats.health;
              const newHealth = Math.max(0, latestHealth - totalDamage);
              const newQuantity = Math.ceil(newHealth / healthPerUnit);
              
              console.log(`[Battle Damage] ${battalionId} dealing ${totalDamage} damage to ${enemyId}. Health: ${latestHealth} -> ${newHealth}`);

              const updatedBatts = prevBatts.map((batt, idx) => {
                if (idx === target.index) {
                  return {
                    ...batt,
                    currentHealth: newHealth,
                    quantity: newQuantity
                  };
                }
                return batt;
              });

              // If battalion is destroyed, clear all its attack intervals
              if (newHealth <= 0) {
                console.log(`[Battalion Destroyed] ${enemyId} has been destroyed`);
                Object.keys(attackIntervals.current).forEach(key => {
                  if (key.includes(enemyId)) {
                    console.log(`[Combat End] Clearing attack interval ${key}`);
                    clearInterval(attackIntervals.current[key]);
                    delete attackIntervals.current[key];
                  }
                });
              }
              
              return updatedBatts;
            });
          }
        }, 100);

        // Set up recurring attacks
        const intervalKey = `${battalionId}-${enemyId}`;
        console.log(`[Combat Setup] Setting up recurring attacks for ${battalionId} against ${enemyId} with interval ${attackInterval}ms`);
        
        attackIntervals.current[intervalKey] = setInterval(() => {
          // Verify both battalions are still alive before executing attack
          if (battalion.quantity <= 0) {
            console.log(`[Combat] ${battalionId} destroyed, clearing attack interval`);
            clearInterval(attackIntervals.current[intervalKey]);
            delete attackIntervals.current[intervalKey];
            return;
          }

          const targetBatts = isUser ? enemyBattalions : userBattalions;
          if (!targetBatts || targetBatts[target.index].quantity <= 0) {
            console.log(`[Combat] ${enemyId} destroyed, finding new target for ${battalionId}`);
            clearInterval(attackIntervals.current[intervalKey]);
            delete attackIntervals.current[intervalKey];
            
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
            if (newTargets.length > 0) {
              console.log(`[Retarget] Moving to new target: ${newTargets[0].type} ${newTargets[0].index}`);
              moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
            }
            return;
          }

          console.log(`[Attack] ${battalionId} executing attack on ${enemyId}`);
          battalionRefs.current[battalionId]?.triggerAttackAnimation();
          
          setTimeout(() => {
            battalionRefs.current[enemyId]?.triggerDamageAnimation();
            
            // Calculate and apply damage
            const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
            const totalDamage = attackPower * battalion.quantity;
            
            // Get latest health from state by using a callback to ensure we have the most recent value
            if (isUser) {
              setEnemyBattalions(prevBatts => {
                const latestHealth = prevBatts[target.index].currentHealth;
                const healthPerUnit = BOT_CATEGORIES[enemyBattalion.type].stats.health;
                const newHealth = Math.max(0, latestHealth - totalDamage);
                const newQuantity = Math.ceil(newHealth / healthPerUnit);
                
                console.log(`[Battle Damage] ${battalionId} dealing ${totalDamage} damage to ${enemyId}. Health: ${latestHealth} -> ${newHealth}`);

                // Create new array with updated health
                const updatedBatts = prevBatts.map((batt, idx) => {
                  if (idx === target.index) {
                    return {
                      ...batt,
                      currentHealth: newHealth,
                      quantity: newQuantity
                    };
                  }
                  return batt;
                });
                
                console.log(`[Battalion Update] ${enemyId} new state:`, updatedBatts[target.index]);
                return updatedBatts;
              });
            } else {
              setUserBattalions(prevBatts => {
                const latestHealth = prevBatts[target.index].currentHealth;
                const healthPerUnit = BOT_CATEGORIES[enemyBattalion.type].stats.health;
                const newHealth = Math.max(0, latestHealth - totalDamage);
                const newQuantity = Math.ceil(newHealth / healthPerUnit);
                
                console.log(`[Battle Damage] ${battalionId} dealing ${totalDamage} damage to ${enemyId}. Health: ${latestHealth} -> ${newHealth}`);

                // Create new array with updated health
                const updatedBatts = prevBatts.map((batt, idx) => {
                  if (idx === target.index) {
                    return {
                      ...batt,
                      currentHealth: newHealth,
                      quantity: newQuantity
                    };
                  }
                  return batt;
                });
                
                console.log(`[Battalion Update] ${enemyId} new state:`, updatedBatts[target.index]);
                return updatedBatts;
              });
            }

            // Trigger damage animation
            battalionRefs.current[enemyId]?.triggerDamageAnimation();

            // Check if battalion is destroyed using the latest health
            if (isUser) {
              setEnemyBattalions(prevBatts => {
                const currentHealth = prevBatts[target.index].currentHealth;
                console.log(`[Health Check] ${enemyId} health check: ${currentHealth}`);
                if (currentHealth <= 0) {
                  console.log(`[Battalion Destroyed] ${enemyId} has been destroyed`);
                  console.log(`[Combat End] Clearing attack interval ${intervalKey}`);
                  clearInterval(attackIntervals.current[intervalKey]);
                  delete attackIntervals.current[intervalKey];
                }
                return prevBatts;
              });
            } else {
              setUserBattalions(prevBatts => {
                const currentHealth = prevBatts[target.index].currentHealth;
                console.log(`[Health Check] ${enemyId} health check: ${currentHealth}`);
                if (currentHealth <= 0) {
                  console.log(`[Battalion Destroyed] ${enemyId} has been destroyed`);
                  console.log(`[Combat End] Clearing attack interval ${intervalKey}`);
                  clearInterval(attackIntervals.current[intervalKey]);
                  delete attackIntervals.current[intervalKey];
                }
                return prevBatts;
              });
            }
          }, 100);
        }, attackInterval);
      }
    }, 150);
  };

  return {
    getAnimatedPosition,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath
  };
}; 