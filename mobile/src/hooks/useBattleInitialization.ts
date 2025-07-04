/**
 * @hook useBattleInitialization
 * @description Handles the initialization and setup of battle state and configurations
 * 
 * @important This hook centralizes all battle initialization logic
 * @dependencies BattleNode, BattalionPosition, Animated
 */

import { useState, useCallback, useMemo } from 'react';
import { Animated, Dimensions } from 'react-native';
import { BattleNode, BattalionPosition } from '../types/battle';
import { BOT_CATEGORIES } from '../utils/battleConstants';
import { calculateBattalionHealth, calculateInitialNodeHealth } from '../utils/healthUtils';
import { BattalionType } from '../types/battle';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const useBattleInitialization = () => {
  // Calculate initial health for neutral nodes
  const initialNodeHealth = useMemo(() => {
    // Use the same logic as calculateInitialHealth, but only for neutral nodes
    // (or use a fixed value for now if needed)
    return 1000; // TODO: Replace with dynamic calculation if needed
  }, []);

  // Initialize nodes with proper positioning and states (memoized to prevent re-creation)
  const [nodes, setNodes] = useState<BattleNode[]>([
    // Left side (user) nodes
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.25, health: 0, captureProgress: 0 },     // 0
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.525, health: 0, captureProgress: 0 },    // 1
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.8, health: 0, captureProgress: 0 },      // 2
    
    // Middle nodes (neutral)
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.375, health: initialNodeHealth, captureProgress: 0 },  // 3
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.525, health: initialNodeHealth, captureProgress: 0 },  // 4
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.675, health: initialNodeHealth, captureProgress: 0 },  // 5
    
    // Right side (enemy) nodes
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.25, health: 0, captureProgress: 0 },    // 6
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.525, health: 0, captureProgress: 0 },   // 7
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.8, health: 0, captureProgress: 0 },     // 8
  ]);

  // Initialize battalions with proper positioning (memoized initial state)
  const initialUserBattalions = useMemo<BattalionPosition[]>(() => [
    { 
      type: BattalionType.BREACHER, 
      quantity: 5, 
      nodeIndex: 0, 
      position: new Animated.ValueXY({ x: nodes[0].x - 10, y: nodes[0].y - 10 }),
              currentHealth: BOT_CATEGORIES?.['breacher']?.stats?.health * 5 || 0,
      mark: 0
    },
    { 
      type: BattalionType.GUARDIAN, 
      quantity: 3, 
      nodeIndex: 1, 
      position: new Animated.ValueXY({ x: nodes[1].x - 10, y: nodes[1].y - 10 }),
              currentHealth: BOT_CATEGORIES?.['guardian']?.stats?.health * 3 || 0,
      mark: 0
    },
    { 
      type: BattalionType.PHREAK, 
      quantity: 4, 
      nodeIndex: 2, 
      position: new Animated.ValueXY({ x: nodes[2].x - 10, y: nodes[2].y - 10 }),
              currentHealth: BOT_CATEGORIES?.['phreak']?.stats?.health * 4 || 0,
      mark: 0
    }
  ], [nodes]);

  const initialEnemyBattalions = useMemo<BattalionPosition[]>(() => [
    { 
      type: BattalionType.BREACHER, 
      quantity: 24,
      nodeIndex: 6, 
      position: new Animated.ValueXY({ x: nodes[6].x - 10, y: nodes[6].y - 10 }),
              currentHealth: BOT_CATEGORIES?.['breacher']?.stats?.health * 24 || 0,
      mark: 0
    },
    { 
      type: BattalionType.GUARDIAN, 
      quantity: 21,
      nodeIndex: 7, 
      position: new Animated.ValueXY({ x: nodes[7].x - 10, y: nodes[7].y - 10 }),
              currentHealth: BOT_CATEGORIES?.['guardian']?.stats?.health * 21 || 0,
      mark: 0
    },
    { 
      type: BattalionType.PHREAK, 
      quantity: 18,
      nodeIndex: 8, 
      position: new Animated.ValueXY({ x: nodes[8].x - 10, y: nodes[8].y - 10 }),
              currentHealth: BOT_CATEGORIES?.['phreak']?.stats?.health * 18 || 0,
      mark: 0
    }
  ], [nodes]);

  // State setters with optimized updates
  const [userBattalions, setUserBattalions] = useState<BattalionPosition[]>(initialUserBattalions);
  const [enemyBattalions, setEnemyBattalions] = useState<BattalionPosition[]>(initialEnemyBattalions);

  /**
   * @function calculateInitialHealth
   * @description Calculates initial health for nodes based on total army strength
   * @important DO NOT DELETE - Critical for game balance
   */
  const calculateInitialHealth = useCallback(() => {
    let total = 0;
    userBattalions.forEach(battalion => {
      total += BOT_CATEGORIES?.[battalion.type]?.stats?.health * battalion.quantity || 0;
    });
    enemyBattalions.forEach(battalion => {
      total += BOT_CATEGORIES?.[battalion.type]?.stats?.health * battalion.quantity || 0;
    });
    return Math.floor(total * 0.75); // 75% of total army health
  }, [userBattalions, enemyBattalions]);

  /**
   * Optimized battalion update function to minimize re-renders
   */
  const updateUserBattalions = useCallback((updater: (prev: BattalionPosition[]) => BattalionPosition[]) => {
    setUserBattalions(prev => {
      const newBattalions = updater(prev);
      // Only update if there's an actual change
      if (JSON.stringify(newBattalions) !== JSON.stringify(prev)) {
        return newBattalions;
      }
      return prev;
    });
  }, []);

  const updateEnemyBattalions = useCallback((updater: (prev: BattalionPosition[]) => BattalionPosition[]) => {
    setEnemyBattalions(prev => {
      const newBattalions = updater(prev);
      // Only update if there's an actual change
      if (JSON.stringify(newBattalions) !== JSON.stringify(prev)) {
        return newBattalions;
      }
      return prev;
    });
  }, []);

  return {
    nodes,
    setNodes,
    userBattalions,
    setUserBattalions: updateUserBattalions,
    enemyBattalions,
    setEnemyBattalions: updateEnemyBattalions,
    calculateInitialHealth,
  };
}; 