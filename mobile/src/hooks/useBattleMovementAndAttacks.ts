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
import { checkForInfiniteLoop, getAnimatedPosition, cleanupBattalion } from './useMovement';
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

  // ============================================================================
  // FUNCTIONS FROM useBattleMovement.ts
  // ============================================================================

  // Position calculation
  // getAnimatedPosition is now imported from useMovement hook

  // TODO: Clean up this function so it finds the nearest available target (node or battalion) equally, without prioritizing nodes first.
  // It should use a pathfinding algorithm to determine the closest target of any type, and select that as the target.
  // Remove the current logic that always prioritizes nodes over battalions.
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

    // If no neutral nodes found, check enemy battalions
    if (allTargets.length === 0) {
      const enemyBatts = isUser ? enemyBattalions : userBattalions;
      
      enemyBatts.forEach((enemyBattalion, index) => {
        if (!enemyBattalion || enemyBattalion.quantity <= 0 || enemyBattalion.currentHealth <= 0) {
          return;
        }
        
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
    
    return validTargets;
  }, [nodes]);

  // Movement with improved validation
  const moveBattalionAlongPath = useCallback((
    battalion: BattalionPosition,
    target: BattleTarget,
    isUser: boolean,
    userBattalions?: BattalionPosition[],
    enemyBattalions?: BattalionPosition[]
  ): void => {
    // --- START: Minimal Battalion ID Fix Test ---
    // Find the battalion's array index to generate consistent ID
    const battalionArray = isUser ? (userBattalions || []) : (enemyBattalions || []);
    const battalionIndex = battalionArray.findIndex(b => b === battalion);
    const battalionId = battalionIndex >= 0 
      ? `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalionIndex}`
      : `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`; // fallback
    // --- END: Minimal Battalion ID Fix Test ---
    
    // Check if battalion is destroyed
    if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
      cleanupBattalion(battalionId, attackIntervals.current);
      return;
    }

    // Validate node target before proceeding
    if (target.type === 'node') {
      const node = nodes[target.index];
      // Only retarget if node is not neutral (captured)
      if (node.controlState !== 'neutral') {
        battalion.targetNode = undefined;
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
        return;
      }
    }

    if (!target || !target.position) return;
    
    // Check target validity before any movement or path calculation
    if (target.type === 'node') {
      const targetNode = nodes[target.index];
      if (targetNode.controlState !== 'neutral') {
        return;
      }
    }
    
    // Check if battalion is already in attack range before any movement calculations
    const currentPos = getAnimatedPosition(battalion.position);
    const dx = target.position.x - currentPos.x;
    const dy = target.position.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const range = BOT_CATEGORIES[battalion.type].stats.range * RANGE_MULTIPLIER;
    
    if (distance <= range) {
      setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      return;
    }
    
    // Only for node targets, try using the calculated path
    if (target.type === 'node') {
      const targetNode = nodes[target.index];
      if (targetNode.controlState !== 'neutral') {
        return;
      }
      
      const { distances, previousNodes } = findShortestPaths(battalion.nodeIndex, nodes);
      const path = reconstructPath(battalion.nodeIndex, target.index, previousNodes);
      
      // Validate that we have a valid path before allowing any movement
      if (path.length === 0) {
        return;
      }
      
      if (path.length === 1) {
        setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
        return;
      }
      
      // If we have a valid path with more than 1 step, use the first step
      if (path.length >= 2) {
        const nextNodeIndex = path[1];
        const nextNode = nodes[nextNodeIndex];
        if (nextNode) {
          // Use the next node's position instead of target position
          target.position = { x: nextNode.x, y: nextNode.y };
          
          // Store the remaining path for continuation
          battalion.remainingPath = path.slice(1);
          battalion.finalTarget = target.index;
        }
      }
    } else if (target.type === 'battalion') {
      // --- START: Step 3 - Battalion Path Following Check ---
      // Check if we have a remaining path to follow (same as node targets)
      if (battalion.remainingPath && battalion.remainingPath.length > 0 && battalion.finalTarget !== undefined) {
        const nextNodeIndex = battalion.remainingPath[0];
        const nextNode = nodes[nextNodeIndex];
        
        if (nextNode) {
          // Check for infinite loop
          if (checkForInfiniteLoop(battalionId, 'battalion-path-following')) {
            // Clear path data to break the loop
            battalion.remainingPath = undefined;
            battalion.finalTarget = undefined;
            console.log(`[LOOP BREAK] ${battalionId} - Cleared path data to break infinite loop`);
            return;
          }
          
          debugLog(`[Step 3 Battalion Path Following] ${battalionId} - Continuing path: [${battalion.remainingPath.join(' -> ')}] to final target ${battalion.finalTarget}`);
          
          // Update battalion position to the current node
          battalion.nodeIndex = target.index;
          
          // Remove the current node from remaining path
          battalion.remainingPath = battalion.remainingPath.slice(1);
          
          debugLog(`[Step 3 Battalion Path Update] ${battalionId} - Updated to node ${target.index}, remaining path: [${battalion.remainingPath.join(' -> ')}]`);
          
          // Move to the next node in the path
          const nextTarget = {
            type: 'node' as const,
            index: nextNodeIndex,
            distance: 0,
            position: { x: nextNode.x, y: nextNode.y }
          };
          
          debugLog(`[Step 3 Battalion Movement] ${battalionId} - Moving to next node ${nextNodeIndex} at position (${nextNode.x.toFixed(1)}, ${nextNode.y.toFixed(1)})`);
          
          moveBattalionAlongPath(battalion, nextTarget, isUser, userBattalions, enemyBattalions);
          return;
        }
      }
      
      // If we've reached the final target, clear path data
      if (battalion.finalTarget !== undefined && target.index === battalion.finalTarget) {
        battalion.remainingPath = undefined;
        battalion.finalTarget = undefined;
      }
      // --- END: Step 3 - Battalion Path Following Check ---
      
      const enemyBatts = isUser ? enemyBattalions : userBattalions;
      const enemyBattalion = enemyBatts?.[target.index];
      
      if (!enemyBattalion) return;
      
      const enemyRange = BOT_CATEGORIES[enemyBattalion.type].stats.range * RANGE_MULTIPLIER;
      
      // Calculate path to enemy battalion's node position
      const targetNodeIndex = enemyBattalion.nodeIndex;
      
      const { distances, previousNodes } = findShortestPaths(battalion.nodeIndex, nodes);
      const battalionPath = reconstructPath(battalion.nodeIndex, targetNodeIndex, previousNodes);
      
      // --- START: Step 3 - Battalion Targeting Debug ---
      debugLog(`[Step 3 Battalion Debug] ${battalionId} - Battalion targeting: path=[${battalionPath.join(' -> ')}], targetNode=${targetNodeIndex}`);
      // --- END: Step 3 - Battalion Targeting Debug ---
      
      // --- START: Step 3 - Battalion Path Following Implementation ---
      // Set path following data for battalion targets (same as node targets)
      if (battalionPath.length >= 2) {
        const nextNodeIndex = battalionPath[1];
        const nextNode = nodes[nextNodeIndex];
        if (nextNode) {
          // Store the remaining path for continuation
          battalion.remainingPath = battalionPath.slice(1);
          battalion.finalTarget = targetNodeIndex;
          
          debugLog(`[Step 3 Battalion Path Set] ${battalionId} - Set remainingPath=[${battalion.remainingPath.join(' -> ')}], finalTarget=${battalion.finalTarget}`);
        }
      }
      // --- END: Step 3 - Battalion Path Following Implementation ---
    }
    
    // Recalculate distance and direction after potential target position updates
    const updatedDx = target.position.x - currentPos.x;
    const updatedDy = target.position.y - currentPos.y;
    const updatedDistance = Math.sqrt(updatedDx * updatedDx + updatedDy * updatedDy);
    
    if (isNaN(updatedDistance) || updatedDistance === 0) {
      return;
    }

    const directionX = updatedDx / updatedDistance;
    const directionY = updatedDy / updatedDistance;
    
    // Calculate movement distance based on target type
    let moveDistance: number;
    if (target.type === 'node') {
      // For nodes, move to attack range, not to the center
      const optimalDistance = range; // We want to be at our attack range from the node
      if (updatedDistance <= range) {
        // Already in range, don't move
        moveDistance = 0;
      } else {
        // Move to our attack range from the node
        moveDistance = updatedDistance - optimalDistance;
      }
    } else {
      // For enemy battalions, we need to consider both attack ranges
      // Get the enemy battalion's attack range
      const enemyBatts = isUser ? enemyBattalions : userBattalions;
      const enemyBattalion = enemyBatts?.[target.index];
      
      if (!enemyBattalion) return;
      
      const enemyRange = BOT_CATEGORIES[enemyBattalion.type].stats.range * RANGE_MULTIPLIER;
      
      // We want to be at our attack range from the enemy, but not so close that we're in their attack range
      // The optimal position is at our range from them, but we need to ensure we're not overlapping ranges
      const combinedRange = range + enemyRange;
      const optimalDistance = range; // We want to be at our attack range from the enemy
      
      // If the enemy is too close (within our range), we don't need to move
      if (updatedDistance <= range) {
        moveDistance = 0;
      } else {
        // Move to our attack range from the enemy
        moveDistance = updatedDistance - optimalDistance;
      }
    }
    
    // If in range, start attacking
    if (moveDistance < 0.5 && Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      return;
    }

    // If we're already in range but the moveDistance calculation is wrong, start attacking anyway
    if (updatedDistance <= range) {
      setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      return;
    }

    const rangePosition = {
      x: currentPos.x + (directionX * moveDistance),
      y: currentPos.y + (directionY * moveDistance)
    };
    
    cleanupBattalion(battalionId, attackIntervals.current);

    const speed = BOT_CATEGORIES[battalion.type].stats.speed;
    // Calculate duration based on distance and speed
    const baseDuration = calculateMovementDuration(speed);
    const movementDuration = (moveDistance / 100) * baseDuration; // Scale by distance
    
    Animated.timing(battalion.position, {
      toValue: rangePosition,
      duration: movementDuration,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (!finished) return;
      
      // Check if battalion was destroyed during movement
      if (battalion.quantity <= 0 || battalion.currentHealth <= 0) {
        cleanupBattalion(battalionId, attackIntervals.current);
        return;
      }

      if (target.type === 'node') {
        const node = nodes[target.index];
        // Only retarget if node is not neutral (captured)
        if (node.controlState !== 'neutral') {
          battalion.targetNode = undefined;
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
          return;
        }
        
        // Check if we have a remaining path to follow
        if (battalion.remainingPath && battalion.remainingPath.length > 0 && battalion.finalTarget !== undefined) {
          const nextNodeIndex = battalion.remainingPath[0];
          const nextNode = nodes[nextNodeIndex];
          
          if (nextNode) {
            // --- START: Step 3 - Path Following Verification ---
            debugLog(`[Step 3 Path Following] ${battalionId} - Continuing path: [${battalion.remainingPath.join(' -> ')}] to final target ${battalion.finalTarget}`);
            // --- END: Step 3 - Path Following Verification ---
            
            // Update battalion position to the current node
            battalion.nodeIndex = target.index;
            
            // Remove the current node from remaining path
            battalion.remainingPath = battalion.remainingPath.slice(1);
            
            // --- START: Step 3 - Verify Path Update ---
            debugLog(`[Step 3 Path Update] ${battalionId} - Updated to node ${target.index}, remaining path: [${battalion.remainingPath.join(' -> ')}]`);
            // --- END: Step 3 - Verify Path Update ---
            
            // Move to the next node in the path
            const nextTarget = {
              type: 'node' as const,
              index: nextNodeIndex,
              distance: 0,
              position: { x: nextNode.x, y: nextNode.y }
            };
            
            // --- START: Step 3 - Verify Movement to Next Node ---
            debugLog(`[Step 3 Movement] ${battalionId} - Moving to next node ${nextNodeIndex} at position (${nextNode.x.toFixed(1)}, ${nextNode.y.toFixed(1)})`);
            // --- END: Step 3 - Verify Movement to Next Node ---
            
            moveBattalionAlongPath(battalion, nextTarget, isUser, userBattalions, enemyBattalions);
            return;
          }
        }
        
        // If we've reached the final target, clear path data and start attacking
        if (battalion.finalTarget !== undefined && target.index === battalion.finalTarget) {
          battalion.remainingPath = undefined;
          battalion.finalTarget = undefined;
        }
        
        // Continue attacking neutral node
        setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
      } else if (target.type === 'battalion') {
        const enemyBatts = isUser ? enemyBattalions : userBattalions;
        const enemyBattalion = enemyBatts?.[target.index];
        
        // Check if target battalion was destroyed
        if (!enemyBattalion || enemyBattalion.quantity <= 0 || enemyBattalion.currentHealth <= 0) {
          battalion.targetNode = undefined;
          const newTargets = findAvailableTargets(battalion, isUser, userBattalions || [], enemyBattalions || []);
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
    // --- START: Minimal Battalion ID Fix Test ---
    // Find the battalion's array index to generate consistent ID
    const battalionArray = isUser ? battalionsRef.current.user : battalionsRef.current.enemy;
    const battalionIndex = battalionArray.findIndex(b => b === battalion);
    const battalionId = battalionIndex >= 0 
      ? `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalionIndex}`
      : `${isUser ? 'user' : 'enemy'}-${battalion.type}-${battalion.nodeIndex}`; // fallback
    // --- END: Minimal Battalion ID Fix Test ---
    
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