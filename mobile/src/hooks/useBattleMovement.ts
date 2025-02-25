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
  battalionRefs: React.MutableRefObject<{ [key: string]: any }>,
  attackIntervals: React.MutableRefObject<{ [key: string]: NodeJS.Timeout }>,
  nodeRefs: React.MutableRefObject<{[key: string]: any}>
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
      x: position.x._value || 0,
      y: position.y._value || 0
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

    // If within attack range of battalion target, start attacking while moving
    if (target.type === 'battalion' && distance <= range) {
      console.log(`[Attack] ${battalionId} in range of target while moving, starting attacks`);
      setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
    }

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
        console.log(`[Movement] ${battalionId} reached position for ${target.type} ${target.index}`);
        
        // Don't set up attacks if this battalion is defeated
        if (battalion.quantity <= 0) {
          console.log(`[Attack] ${battalionId} is defeated, cannot attack`);
          return;
        }

        // For nodes, verify target is still valid and set up attacks
        if (target.type === 'node') {
          const node = nodes[target.index];
          if (node.controlState !== 'neutral') {
            console.log(`[Attack] ${battalionId}: Node ${target.index} is no longer neutral, finding new target`);
            const newTargets = findAvailableTargets(battalion, isUser, userBattalions!, enemyBattalions!);
            if (newTargets.length > 0) {
              moveBattalionAlongPath(battalion, newTargets[0], isUser, userBattalions, enemyBattalions);
            }
            return;
          }
          setupAttacks(battalion, target, isUser, battalionId, userBattalions, enemyBattalions);
        }
        // For battalions, we're already attacking if in range, no need to set up again
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
    const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
    const attackInterval = 2000 * (5 / attackSpeed);
    console.log(`[Attack] ${battalionId} setting up attacks every ${attackInterval}ms`);
    
    setTimeout(() => {
      const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
      const totalDamage = attackPower * battalion.quantity;
      console.log(`[Attack] ${battalionId} preparing to deal ${totalDamage} damage`);
      
      if (target.type === 'node') {
        const nodeRef = nodeRefs.current[target.index];
        if (nodeRef) {
          console.log(`[Attack] ${battalionId} initiating node attack sequence on node ${target.index}`);
          battalionRefs.current[battalionId]?.triggerAttackAnimation();
          
          // Initial attack
          setTimeout(() => {
            nodeRef.triggerDamageAnimation();
            const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
            console.log(`[Attack] ${battalionId} initial node attack ${damageApplied ? 'successful' : 'failed'}`);
            if (!damageApplied) return;
          }, 100);

          // Recurring attacks
          const intervalKey = `${battalionId}-${target.index}`;
          attackIntervals.current[intervalKey] = setInterval(() => {
            console.log(`[Attack] ${battalionId} executing attack on node ${target.index}`);
            battalionRefs.current[battalionId]?.triggerAttackAnimation();
            
            setTimeout(() => {
              nodeRef.triggerDamageAnimation();
              const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
              if (!damageApplied) {
                console.log(`[Attack] ${battalionId} attack failed - node ${target.index} no longer valid target`);
                clearInterval(attackIntervals.current[intervalKey]);
                delete attackIntervals.current[intervalKey];
              }
            }, 100);
          }, attackInterval);
        }
      } else if (target.type === 'battalion') {
        // Battalion vs battalion combat
        const enemyBatts = isUser ? enemyBattalions : userBattalions;
        if (!enemyBatts || !enemyBatts[target.index]) {
          console.log(`[Attack] ${battalionId}: Enemy battalion ${target.index} not found`);
          return;
        }

        const enemyBattalion = enemyBatts[target.index];
        const enemyId = `${!isUser ? 'user' : 'enemy'}-${enemyBattalion.type}-${enemyBattalion.nodeIndex}`;
        console.log(`[Attack] ${battalionId} initiating battalion combat with ${enemyId}`);
        
        // Initial attack
        battalionRefs.current[battalionId]?.triggerAttackAnimation();
        setTimeout(() => {
          battalionRefs.current[enemyId]?.triggerDamageAnimation();
          enemyBattalion.quantity = Math.max(0, enemyBattalion.quantity - totalDamage);
          console.log(`[Attack] ${battalionId} dealt ${totalDamage} damage to ${enemyId}, remaining quantity: ${enemyBattalion.quantity}`);
        }, 100);

        // Recurring attacks
        const intervalKey = `${battalionId}-${enemyId}`;
        attackIntervals.current[intervalKey] = setInterval(() => {
          console.log(`[Attack] ${battalionId} executing attack on ${enemyId}`);
          battalionRefs.current[battalionId]?.triggerAttackAnimation();
          
          setTimeout(() => {
            if (enemyBattalion.quantity <= 0) {
              console.log(`[Attack] ${battalionId}: Enemy ${enemyId} defeated, clearing interval`);
              clearInterval(attackIntervals.current[intervalKey]);
              delete attackIntervals.current[intervalKey];
              return;
            }
            
            battalionRefs.current[enemyId]?.triggerDamageAnimation();
            enemyBattalion.quantity = Math.max(0, enemyBattalion.quantity - totalDamage);
            console.log(`[Attack] ${battalionId} dealt ${totalDamage} damage to ${enemyId}, remaining quantity: ${enemyBattalion.quantity}`);
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