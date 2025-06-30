/**
 * @hook useBattleControl
 * @description Manages battle control mechanics and node state transitions
 * 
 * @important This hook centralizes node control logic
 * @dependencies BattleNode, NETWORK_CONNECTIONS
 */

import { useCallback } from 'react';
import { BattleNode } from '../types/battle';
import { NETWORK_CONNECTIONS, getConnectedNodes } from '../utils/networkConstants';
import { isNeutral, getUserNodes, getEnemyNodes } from '../utils/nodeOwnership';

export const useBattleControl = (
  nodes: BattleNode[],
  setNodes: (nodes: BattleNode[]) => void
) => {
  /**
   * @function updateNodeControl
   * @description Updates node control state based on damage and current controller
   */
  const updateNodeControl = useCallback((
    nodeIndex: number,
    damage: number,
    isUser: boolean
  ): boolean => {
    const node = nodes[nodeIndex];
    if (!node || node.isLocked) return false;

    if (isNeutral(nodeIndex)) {
      const newProgress = (node.controlProgress || 0) + (damage * (isUser ? 1 : -1));
      const maxControl = node.health || 1000; // Fallback value
      
      if (Math.abs(newProgress) >= maxControl) {
        // Node captured - update node state for backward compatibility only
        setNodes(nodes.map((n, i) => 
          i === nodeIndex ? {
            ...n,
            isLocked: true,
            controlProgress: undefined,
            health: undefined
          } : n
        ));
        
        return false; // Stop attacks on captured node
      } else {
        // Update control progress
        setNodes(nodes.map((n, i) => 
          i === nodeIndex ? { ...n, controlProgress: newProgress } : n
        ));
        return true; // Continue attacks
      }
    }
    return false;
  }, [nodes, setNodes]);

  /**
   * @function checkVictoryCondition
   * @description Checks if either side has won the battle
   */
  const checkVictoryCondition = useCallback((): 'user' | 'enemy' | null => {
    const userNodes = getUserNodes();
    const enemyNodes = getEnemyNodes();
    
    if (userNodes.length >= 6) return 'user';
    if (enemyNodes.length >= 6) return 'enemy';
    return null;
  }, []);

  return {
    getConnectedNodes,
    updateNodeControl,
    checkVictoryCondition
  };
}; 