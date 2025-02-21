/**
 * @hook useBattleInitialization
 * @description Handles the initialization and setup of battle state and configurations
 * 
 * @important This hook centralizes all battle initialization logic
 * @dependencies BattleNode, BattalionPosition, Animated
 */

import { useState } from 'react';
import { Animated, Dimensions } from 'react-native';
import { BattleNode, BattalionPosition } from '../types/battle';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const useBattleInitialization = () => {
  // Initialize nodes with proper positioning and states
  const [nodes, setNodes] = useState<BattleNode[]>([
    // Left side (user) nodes
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.25, controlState: 'user' },     // 0
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.525, controlState: 'user' },    // 1
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.8, controlState: 'user' },      // 2
    
    // Middle nodes (neutral)
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.375, controlState: 'neutral' },  // 3
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.525, controlState: 'neutral' },  // 4
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.675, controlState: 'neutral' },  // 5
    
    // Right side (enemy) nodes
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.25, controlState: 'enemy' },    // 6
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.525, controlState: 'enemy' },   // 7
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.8, controlState: 'enemy' },     // 8
  ]);

  // Initialize battalions with proper positioning
  const [userBattalions, setUserBattalions] = useState<BattalionPosition[]>([
    { 
      type: 'breacher', 
      quantity: 5, 
      nodeIndex: 0, 
      position: new Animated.ValueXY({ x: 20, y: SCREEN_HEIGHT * 0.225 }) 
    },
    { 
      type: 'guardian', 
      quantity: 3, 
      nodeIndex: 1, 
      position: new Animated.ValueXY({ x: 20, y: SCREEN_HEIGHT * 0.5 }) 
    },
    { 
      type: 'phreak', 
      quantity: 4, 
      nodeIndex: 2, 
      position: new Animated.ValueXY({ x: 20, y: SCREEN_HEIGHT * 0.775 }) 
    }
  ]);

  const [enemyBattalions, setEnemyBattalions] = useState<BattalionPosition[]>([
    { 
      type: 'breacher', 
      quantity: 4, 
      nodeIndex: 6, 
      position: new Animated.ValueXY({ x: SCREEN_WIDTH - 165, y: SCREEN_HEIGHT * 0.225 }) 
    },
    { 
      type: 'guardian', 
      quantity: 4, 
      nodeIndex: 7, 
      position: new Animated.ValueXY({ x: SCREEN_WIDTH - 165, y: SCREEN_HEIGHT * 0.5 }) 
    },
    { 
      type: 'phreak', 
      quantity: 3, 
      nodeIndex: 8, 
      position: new Animated.ValueXY({ x: SCREEN_WIDTH - 165, y: SCREEN_HEIGHT * 0.775 }) 
    }
  ]);

  /**
   * @function calculateInitialHealth
   * @description Calculates initial health for nodes based on total army strength
   * @important DO NOT DELETE - Critical for game balance
   */
  const calculateInitialHealth = () => {
    let total = 0;
    userBattalions.forEach(battalion => {
      total += BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity;
    });
    enemyBattalions.forEach(battalion => {
      total += BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity;
    });
    return Math.floor(total * 0.75); // 75% of total army health
  };

  return {
    nodes,
    setNodes,
    userBattalions,
    setUserBattalions,
    enemyBattalions,
    setEnemyBattalions,
    calculateInitialHealth,
  };
}; 