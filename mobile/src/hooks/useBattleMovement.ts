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
    const layout = position.getLayout();
    return {
      x: layout.left,
      y: layout.top
    };
  }, []);

  // IMPORTANT: Keep target finding logic isolated
  const findAvailableTargets = useCallback((battalion: BattalionPosition, isUser: boolean): BattleTarget[] => {
    console.log(`[Targeting] Finding targets for ${isUser ? 'user' : 'enemy'} battalion at node ${battalion.nodeIndex}`);
    
    const range = BOT_CATEGORIES[battalion.type].stats.range;
    const currentPos = getAnimatedPosition(battalion.position);
    const currentNodeIndex = battalion.nodeIndex;
    
    // Get all nodes connected to the battalion's current node
    const connectedNodeIndices = getConnectedNodes(currentNodeIndex);
    console.log(`[Targeting] Connected nodes for ${currentNodeIndex}:`, connectedNodeIndices);
    
    const targets = nodes
      .map((node, index) => ({
        type: 'node' as const,
        index,
        distance: Math.sqrt(
          Math.pow(Number(node.x) - Number(currentPos.x), 2) + 
          Math.pow(Number(node.y) - Number(currentPos.y), 2)
        ),
        position: { x: node.x, y: node.y }
      }))
      .filter(target => {
        // Log each filtering step
        if (!connectedNodeIndices.includes(target.index)) {
          console.log(`[Targeting] Node ${target.index} rejected: not connected`);
          return false;
        }
        
        // Only target neutral nodes or enemy-controlled nodes (for user) or user-controlled nodes (for enemy)
        if (nodes[target.index].controlState === 'neutral') {
          console.log(`[Targeting] Node ${target.index} accepted: neutral node`);
          return true;
        }
        
        if (isUser && nodes[target.index].controlState === 'enemy') {
          console.log(`[Targeting] Node ${target.index} accepted: enemy controlled node`);
          return true;
        }
        
        if (!isUser && nodes[target.index].controlState === 'user') {
          console.log(`[Targeting] Node ${target.index} accepted: user controlled node`);
          return true;
        }

        console.log(`[Targeting] Node ${target.index} rejected: already ${nodes[target.index].controlState} controlled`);
        return false;
      })
      .sort((a, b) => a.distance - b.distance);

    if (targets.length === 0) {
      console.log(`[Targeting] No valid targets found for battalion at node ${currentNodeIndex}`);
    } else {
      console.log(`[Targeting] Found ${targets.length} valid targets, sorted by distance:`, targets.map(t => t.index));
    }
    return targets;
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
    targetNodeIndex: number,
    isUser: boolean
  ) => {
    console.log(`[Movement] Moving ${isUser ? 'user' : 'enemy'} battalion from node ${battalion.nodeIndex} to ${targetNodeIndex}`);
    
    const battalionKey = `${isUser ? 'user' : 'enemy'}-${battalion.nodeIndex}`;
    const targetNode = nodes[targetNodeIndex];
    const startNode = nodes[battalion.nodeIndex];
    
    // Calculate range offset based on battalion type
    const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
    
    // Get current position
    const currentPos = battalion.position.getLayout();
    console.log(`[Movement] Current position:`, currentPos);
    
    // Calculate target position with proper range offset
    const dx = targetNode.x - startNode.x;
    const dy = targetNode.y - startNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;
    
    // Calculate range position relative to target node
    const rangePosition = {
      x: Number(targetNode.x) - (dirX * range),
      y: Number(targetNode.y) - (dirY * range)
    };

    console.log(`[Movement] Target node position:`, { x: targetNode.x, y: targetNode.y });
    console.log(`[Movement] Range position:`, rangePosition);

    // Calculate movement duration based on distance and speed
    const speed = BOT_CATEGORIES[battalion.type].stats.speed;
    const movementDuration = (distance / speed) * 100;

    console.log(`[Movement] Battalion ${battalionKey} moving to range position:`, rangePosition);
    console.log(`[Movement] Movement duration: ${movementDuration}ms`);

    // Update battalion's target node
    battalion.targetNode = targetNodeIndex;
    battalion.nodeIndex = targetNodeIndex; // Update current node index

    // Create and start the animation
    const anim = Animated.timing(battalion.position, {
      toValue: rangePosition,
      duration: movementDuration,
      useNativeDriver: true
    });

    // Start the animation and add a completion callback
    anim.start(({ finished }) => {
      if (finished) {
        console.log(`[Movement] Battalion ${battalionKey} reached target position for node ${targetNodeIndex}`);
        
        // Set up attack interval when in range
        const attackSpeed = BOT_CATEGORIES[battalion.type].stats.speed;
        const attackInterval = 2000 * (5 / attackSpeed);
        
        setTimeout(() => {
          const attackPower = BOT_CATEGORIES[battalion.type].stats.offense;
          const totalDamage = attackPower * battalion.quantity;
          
          // Set up initial attack
          const nodeRef = nodeRefs.current[targetNodeIndex];
          if (nodeRef) {
            battalionRefs.current[battalionKey]?.triggerAttackAnimation();
            setTimeout(() => {
              nodeRef.triggerDamageAnimation();
              const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
              if (!damageApplied) {
                console.log(`[Attack] Initial damage not applied for ${battalionKey}`);
                return;
              }
            }, 100);
          }

          // Set up recurring attacks
          const intervalKey = `${isUser ? 'user' : 'enemy'}-${battalion.nodeIndex}-${targetNodeIndex}`;
          attackIntervals.current[intervalKey] = setInterval(() => {
            if (__DEV__) {
              console.log(`[Attack] Battalion ${intervalKey} attacking`);
            }
            const nodeRef = nodeRefs.current[targetNodeIndex];
            if (nodeRef) {
              battalionRefs.current[battalionKey]?.triggerAttackAnimation();
              setTimeout(() => {
                nodeRef.triggerDamageAnimation();
                const damageApplied = nodeRef.applyDamage(totalDamage, isUser);
                if (!damageApplied) {
                  console.log(`[Attack] Damage not applied, clearing interval ${intervalKey}`);
                  clearInterval(attackIntervals.current[intervalKey]);
                  delete attackIntervals.current[intervalKey];
                }
              }, 100);
            }
          }, attackInterval);

          console.log('[Attack Intervals] Current intervals:', Object.keys(attackIntervals.current));
        }, 150);
      }
    });
  }, [nodes]);

  return {
    getAnimatedPosition,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath
  };
}; 