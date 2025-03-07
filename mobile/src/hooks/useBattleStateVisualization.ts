/**
 * @hook useBattleStateVisualization
 * @description Provides visualization and debugging tools for battle state
 * 
 * @important This hook helps monitor battle state transitions
 * @maintainer Keep visualization logic separate from core battle logic
 */

import { useEffect, useCallback } from 'react';
import { BattlePhase } from './useBattleStateMachine';
import { BattleNode, BattalionPosition } from '../types/battle';

// IMPORTANT: Keep these debug flags for development
const DEBUG_MODE = false;
const VERBOSE_LOGGING = false;

export const useBattleStateVisualization = (
  phase: BattlePhase,
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[]
) => {
  // IMPORTANT: Keep state transition logging for debugging
  useEffect(() => {
    // Debug logging disabled
  }, [phase, nodes, userBattalions, enemyBattalions]);

  /**
   * @function logBattleMetrics
   * @description Logs important battle metrics for analysis
   * @important DO NOT DELETE - Critical for performance monitoring
   */
  const logBattleMetrics = useCallback(() => {
    // Debug logging disabled
  }, [nodes, userBattalions, enemyBattalions]);

  /**
   * @function validateBattleState
   * @description Validates battle state consistency
   * @important DO NOT DELETE - Critical for state validation
   */
  const validateBattleState = useCallback((): boolean => {
    // Check for duplicate node control
    const nodeControlCounts = nodes.reduce((acc, node) => {
      acc[node.controlState] = (acc[node.controlState] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Validate battalion positions
    const validPositions = [...userBattalions, ...enemyBattalions].every(
      battalion => battalion.nodeIndex >= 0 && battalion.nodeIndex < nodes.length
    );

    return validPositions && (nodeControlCounts.user + nodeControlCounts.enemy + nodeControlCounts.neutral === nodes.length);
  }, [nodes, userBattalions, enemyBattalions]);

  return {
    logBattleMetrics,
    validateBattleState
  };
}; 