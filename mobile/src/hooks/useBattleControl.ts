/**
 * @hook useBattleControl
 * @description Manages battle control mechanics and node state transitions
 * 
 * @important This hook centralizes node control logic
 * @dependencies BattleNode, NETWORK_CONNECTIONS
 */

import { useCallback, useState } from 'react';
import { BattleNode } from '../types/battle';

// Network topology for node connections
const NETWORK_CONNECTIONS = [
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
  [0, 4], [1, 3], [1, 5], [2, 4],
  [3, 7], [4, 6], [4, 8], [5, 7]
];

export const useBattleControl = (
  nodes: BattleNode[],
  setNodes: (nodes: BattleNode[]) => void
) => {
  const [controlledNodes, setControlledNodes] = useState<number[]>([0, 1, 2]);

  /**
   * @function getConnectedNodes
   * @description Returns array of node indices connected to given node
   */
  const getConnectedNodes = useCallback((nodeIndex: number): number[] => {
    return NETWORK_CONNECTIONS
      .filter(([from, to]) => from === nodeIndex || to === nodeIndex)
      .map(([from, to]) => from === nodeIndex ? to : from);
  }, []);

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

    if (node.controlState === 'neutral') {
      const newProgress = (node.controlProgress || 0) + (damage * (isUser ? 1 : -1));
      const maxControl = node.health || 1000; // Fallback value
      
      if (Math.abs(newProgress) >= maxControl) {
        // Node captured
        setNodes(nodes.map((n, i) => 
          i === nodeIndex ? {
            ...n,
            controlState: isUser ? 'user' : 'enemy',
            isLocked: true,
            controlProgress: undefined,
            health: undefined
          } : n
        ));
        
        // Update controlled nodes list
        if (isUser) {
          setControlledNodes(prev => [...prev, nodeIndex]);
        }
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
    const userNodes = nodes.filter(n => n.controlState === 'user').length;
    const enemyNodes = nodes.filter(n => n.controlState === 'enemy').length;
    
    if (userNodes >= 6) return 'user';
    if (enemyNodes >= 6) return 'enemy';
    return null;
  }, [nodes]);

  return {
    controlledNodes,
    getConnectedNodes,
    updateNodeControl,
    checkVictoryCondition
  };
}; 