import { useCallback } from 'react';
import { Animated } from 'react-native';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';

// IMPORTANT: Keep movement logic centralized in this hook
export const useBattleMovement = (
  nodes: BattleNode[],
  battalionRefs: React.MutableRefObject<{ [key: string]: any }>,
  attackIntervals: React.MutableRefObject<{ [key: string]: NodeJS.Timeout }>,
  nodeRefs: React.MutableRefObject<{[key: string]: any}>
) => {
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
    const range = BOT_CATEGORIES[battalion.type].stats.range;
    const currentPos = getAnimatedPosition(battalion.position);
    
    return nodes
      .map((node, index) => ({
        type: 'node' as const,
        index,
        distance: Math.sqrt(
          Math.pow(Number(node.x) - Number(currentPos.x), 2) + 
          Math.pow(Number(node.y) - Number(currentPos.y), 2)
        ),
        position: { x: node.x, y: node.y }
      }))
      .filter(target => target.distance <= range);
  }, [nodes]);

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
    const battalionKey = `${isUser ? 'user' : 'enemy'}-${battalion.nodeIndex}`;
    const targetNode = nodes[targetNodeIndex];
    const startNode = nodes[battalion.nodeIndex];
    
    const range = BOT_CATEGORIES[battalion.type].stats.range * 15;
    const dx = targetNode.x - startNode.x;
    const dy = targetNode.y - startNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const dirX = dx / distance;
    const dirY = dy / distance;
    const rangePosition = {
      x: targetNode.x - (dirX * range),
      y: targetNode.y - (dirY * range)
    };

    const speed = BOT_CATEGORIES[battalion.type].stats.speed;
    const movementDuration = (distance / speed) * 100;

    return Animated.timing(battalion.position, {
      toValue: rangePosition,
      duration: movementDuration,
      useNativeDriver: true
    });
  }, [nodes]);

  return {
    getAnimatedPosition,
    findAvailableTargets,
    calculateMovementDuration,
    moveBattalionAlongPath
  };
}; 