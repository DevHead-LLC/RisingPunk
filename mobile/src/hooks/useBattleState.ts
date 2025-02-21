import { useState, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { BattleNode } from '../types/battle';
import { BOT_CATEGORIES } from '../screens/DigitalBarracksScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const useBattleState = () => {
  // IMPORTANT: Keep these type definitions for future reference
  type BattalionPosition = {
    type: 'breacher' | 'guardian' | 'phreak';
    quantity: number;
    nodeIndex: number;
    position: Animated.ValueXY;
  };

  // IMPORTANT: Keep state management centralized here
  const [battleStarted, setBattleStarted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [battleWinner, setBattleWinner] = useState<'user' | 'enemy' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [countdown, setCountdown] = useState(3);

  // IMPORTANT: These refs are critical for battle mechanics
  const battalionRefs = useRef<{ [key: string]: any }>({});
  const attackIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const nodeRefs = useRef<{[key: string]: {
    triggerDamageAnimation: () => void;
    applyDamage: (damage: number, isUser: boolean) => boolean;
  } | null}>({});

  // IMPORTANT: Keep node initialization logic here
  const [nodes, setNodes] = useState<BattleNode[]>([
    // Left side (user) nodes
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.25, controlState: 'user' },
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.525, controlState: 'user' },
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.8, controlState: 'user' },
    
    // Middle nodes (neutral)
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.375, controlState: 'neutral' },
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.525, controlState: 'neutral' },
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.675, controlState: 'neutral' },
    
    // Right side (enemy) nodes
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.25, controlState: 'enemy' },
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.525, controlState: 'enemy' },
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.8, controlState: 'enemy' },
  ]);

  // Add battalion state
  const [userBattalions, setUserBattalions] = useState<BattalionPosition[]>([
    { type: 'breacher', quantity: 5, nodeIndex: 0, position: new Animated.ValueXY({ x: 20, y: SCREEN_HEIGHT * 0.225 }) },
    { type: 'guardian', quantity: 3, nodeIndex: 1, position: new Animated.ValueXY({ x: 20, y: SCREEN_HEIGHT * 0.5 }) },
    { type: 'phreak', quantity: 4, nodeIndex: 2, position: new Animated.ValueXY({ x: 20, y: SCREEN_HEIGHT * 0.775 }) }
  ]);

  const [enemyBattalions, setEnemyBattalions] = useState<BattalionPosition[]>([
    { type: 'breacher', quantity: 4, nodeIndex: 6, position: new Animated.ValueXY({ x: SCREEN_WIDTH - 165, y: SCREEN_HEIGHT * 0.225 }) },
    { type: 'guardian', quantity: 4, nodeIndex: 7, position: new Animated.ValueXY({ x: SCREEN_WIDTH - 165, y: SCREEN_HEIGHT * 0.5 }) },
    { type: 'phreak', quantity: 3, nodeIndex: 8, position: new Animated.ValueXY({ x: SCREEN_WIDTH - 165, y: SCREEN_HEIGHT * 0.775 }) }
  ]);

  // IMPORTANT: Calculate total army health for node initialization
  const calculateTotalArmyHealth = () => {
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
    battleStarted,
    setBattleStarted,
    showResults,
    setShowResults,
    battleWinner,
    setBattleWinner,
    timeRemaining,
    setTimeRemaining,
    countdown,
    setCountdown,
    nodes,
    setNodes,
    battalionRefs,
    attackIntervals,
    nodeRefs,
    calculateTotalArmyHealth,
  };
}; 