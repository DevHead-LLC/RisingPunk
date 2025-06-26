import { useCallback } from 'react';
import { BattleNode, BattalionPosition, BattleTarget } from '../types/battle';
import { getConnectedNodes } from '../utils/networkConstants';
import { getAnimatedPosition } from './useMovement';

export const useTargeting = (nodes: BattleNode[]) => {
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

  return { findAvailableTargets };
}; 