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
const DEBUG_MODE = __DEV__;
const VERBOSE_LOGGING = false;

export const useBattleStateVisualization = (
  phase: BattlePhase,
  nodes: BattleNode[],
  userBattalions: BattalionPosition[],
  enemyBattalions: BattalionPosition[]
) => {
  // IMPORTANT: Keep state transition logging for debugging
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log(`[Battle Phase] ${phase}`);
      
      if (VERBOSE_LOGGING) {
        console.log('[Node Control States]', nodes.map(n => n.controlState));
        console.log('[Battalion Positions]', {
          user: userBattalions.map(b => b.nodeIndex),
          enemy: enemyBattalions.map(b => b.nodeIndex)
        });
      }
    }
  }, [phase, nodes, userBattalions, enemyBattalions]);

  /**
   * @function logBattleMetrics
   * @description Logs important battle metrics for analysis
   * @important DO NOT DELETE - Critical for performance monitoring
   */
  const logBattleMetrics = useCallback(() => {
    if (!DEBUG_MODE) return;

    const controlledByUser = nodes.filter(n => n.controlState === 'user').length;
    const controlledByEnemy = nodes.filter(n => n.controlState === 'enemy').length;
    const neutralNodes = nodes.filter(n => n.controlState === 'neutral').length;

    console.log('[Battle Metrics]', {
      nodeControl: {
        user: controlledByUser,
        enemy: controlledByEnemy,
        neutral: neutralNodes
      },
      battalions: {
        user: userBattalions.reduce((acc, b) => acc + b.quantity, 0),
        enemy: enemyBattalions.reduce((acc, b) => acc + b.quantity, 0)
      }
    });
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