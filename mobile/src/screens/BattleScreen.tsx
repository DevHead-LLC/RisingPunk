import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { BattleNetwork } from '../components/battle/BattleNetwork';
import { BattleHeader } from '../components/battle/BattleHeader';
import { BattleUnits } from '../components/battle/BattleUnits';
import { BattleOverlays } from '../components/battle/BattleOverlays';
import { useBattleAnimations } from '../hooks/useBattleAnimations';
import { useBattleMovementAndAttacks } from '../hooks/useBattleMovementAndAttacks';

import { BOT_CATEGORIES } from './DigitalBarracksScreen';
import { checkRangeIntersection } from '../utils/battleCalculator';
import { BattleNode, BattalionPosition } from '../types/battle';
import { useBattleInitialization } from '../hooks/useBattleInitialization';

type Props = {
  onClose: () => void;
  onBattleComplete?: (winner: 'user' | 'enemy') => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BattalionTarget {
  nodeIndex: number;
  type: 'node' | 'battalion';
  intervalKey: string;
}

type BattleTarget = {
  type: 'node' | 'battalion';
  index: number;
  distance: number;
  position: { x: number; y: number };
};

// Add this constant after the interfaces and before the component
const NETWORK_CONNECTIONS = [
  // Horizontal connections
  [0, 3], [3, 6], // Top row
  [1, 4], [4, 7], // Middle row
  [2, 5], [5, 8], // Bottom row
  // Diagonal connections
  [0, 4], [1, 3], [1, 5], [2, 4],
  [3, 7], [4, 6], [4, 8], [5, 7]
];

export const BattleScreen = React.memo(({ onClose, onBattleComplete }: Props) => {
  const {
    networkOpacity,
    deploymentOpacity,
    battalionOpacity,
    countdownOpacity,
    resultsOpacity,
    startBattleTransition,
    showBattleResults,
    showNetwork,
  } = useBattleAnimations();

  const {
    nodes,
    setNodes,
    userBattalions,
    setUserBattalions,
    enemyBattalions,
    setEnemyBattalions,
    calculateInitialHealth,
  } = useBattleInitialization();

  const [timeRemaining, setTimeRemaining] = useState(20);
  const timerRef = useRef<NodeJS.Timeout>();
  const [showResults, setShowResults] = useState(false);
  const [battleWinner, setBattleWinner] = useState<'user' | 'enemy'>('user');
  const [battleStarted, setBattleStarted] = useState(false);
  const [controlledNodes, setControlledNodes] = useState<number[]>([0, 1, 2]); // User starts controlling left nodes
  const [countdown, setCountdown] = useState(3);
  const battleInitializedRef = useRef(false);

  // IMPORTANT: Use the new battle movement and attacks hook
  const {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
  } = useBattleMovementAndAttacks(
    battleStarted,
    nodes,
    userBattalions,
    enemyBattalions,
  );

  const initializeBattle = () => {
    if (battleInitializedRef.current) return;
    battleInitializedRef.current = true;

    // Show battlefield immediately using the new hook
    showNetwork();
    
    // Initial countdown
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 2) { // Start transition on 1
          clearInterval(countdownTimer);
          startBattleTransition(() => {
            setBattleStarted(true);
            startBattleTimer();
          });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  };

  useEffect(() => {
    initializeBattle();
  }, []);

  const startBattleTimer = () => {
    setTimeRemaining(20);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleBattleComplete('user');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBattleComplete = (winner: 'user' | 'enemy') => {
    setBattleWinner(winner);
    showBattleResults(() => {
      setShowResults(true);
      onBattleComplete?.(winner);
    });
  };

  // Add this function to calculate total army health
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

  // Modify the countdown effect to initialize node health
  useEffect(() => {
    if (countdown === 3) {
      const nodeHealth = calculateTotalArmyHealth();
      // Initialize all nodes with health and control progress
      setNodes(prevNodes => prevNodes.map(node => ({
        ...node,
        health: nodeHealth,
        controlProgress: node.controlState === 'neutral' ? 0 : 
                        node.controlState === 'user' ? 100 : -100,
        isLocked: node.controlState !== 'neutral'
      })));
    }
  }, [countdown]);

  const handleNodeControlChange = (nodeIndex: number, newState: 'user' | 'enemy') => {
    console.log(`[Battle] Node ${nodeIndex} captured by ${newState}`);

    // Find only battalions that were targeting this specific node
    const affectedBattalions = Object.entries(attackIntervals.current)
      .filter(([key]) => {
        const parts = key.split('-');
        if (parts.length !== 3) return false;
        const [side, battalionIndex, targetNode] = parts;
        return side && battalionIndex && targetNode && 
               ['user', 'enemy'].includes(side) &&
               parseInt(targetNode) === nodeIndex;
      })
      .map(([key, interval]) => {
        const [side, battalionIndex] = key.split('-');
        return {
          key,
          interval,
          isUser: side === 'user',
          battalionIndex: parseInt(battalionIndex)
        };
      });

    // Also check for battalions that are currently moving to this node
    const movingUserBattalions = userBattalions
      .filter(b => b.targetNode === nodeIndex)
      .map(b => ({
        key: `user-${b.nodeIndex}-${nodeIndex}`,
        interval: null,
        isUser: true,
        battalionIndex: b.nodeIndex
      }));

    const movingEnemyBattalions = enemyBattalions
      .filter(b => b.targetNode === nodeIndex)
      .map(b => ({
        key: `enemy-${b.nodeIndex}-${nodeIndex}`,
        interval: null,
        isUser: false,
        battalionIndex: b.nodeIndex
      }));

    // Combine all battalions that were targeting this node
    const allAffectedBattalions = [
      ...affectedBattalions,
      ...movingUserBattalions,
      ...movingEnemyBattalions
    ];

    if (allAffectedBattalions.length > 0) {
      console.log(`[Battle] Retargeting ${allAffectedBattalions.length} battalions from captured node ${nodeIndex}`);
    }

    // Clear attack intervals for battalions that were attacking this node
    allAffectedBattalions.forEach(({ key, interval }) => {
      if (interval) {
        console.log(`[Battle] Clearing attack interval for ${key}`);
        clearInterval(interval);
        delete attackIntervals.current[key];
      }
    });

    // Update node control state
    setControlledNodes(prev => {
      const newControlled = newState === 'user' 
        ? [...prev, nodeIndex]
        : prev.filter(n => n !== nodeIndex);
      return newControlled;
    });

    setNodes(prev => {
      const updated = [...prev];
      updated[nodeIndex] = {
        ...updated[nodeIndex],
        controlState: newState,
        controlProgress: newState === 'user' ? 100 : -100,
        isLocked: true, // Lock the node once captured
        health: updated[nodeIndex].health // Preserve current health
      };
      return updated;
    });

    // Clear target nodes for affected battalions
    setUserBattalions(prev => {
      const updated = [...prev];
      allAffectedBattalions
        .filter(b => b.isUser)
        .forEach(({ battalionIndex }) => {
          const battalion = updated.find(b => b.nodeIndex === battalionIndex);
          if (battalion) {
            console.log(`[Battle] Clearing target for user battalion at node ${battalionIndex}`);
            battalion.targetNode = undefined;
          }
        });
      return updated;
    });

    setEnemyBattalions(prev => {
      const updated = [...prev];
      allAffectedBattalions
        .filter(b => !b.isUser)
        .forEach(({ battalionIndex }) => {
          const battalion = updated.find(b => b.nodeIndex === battalionIndex);
          if (battalion) {
            console.log(`[Battle] Clearing target for enemy battalion at node ${battalionIndex}`);
            battalion.targetNode = undefined;
          }
        });
      return updated;
    });

    // Queue finding new targets after state updates
    requestAnimationFrame(() => {
      allAffectedBattalions.forEach(({ isUser, battalionIndex }) => {
        const battalions = isUser ? userBattalions : enemyBattalions;
        const battalion = battalions.find(b => b.nodeIndex === battalionIndex);
        if (battalion) {
          console.log(`[Battle] Finding new target for ${isUser ? 'user' : 'enemy'} battalion at node ${battalionIndex}`);
          findNewTarget(battalion, isUser);
        }
      });
    });
  };

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(attackIntervals.current).forEach(interval => clearInterval(interval));
      attackIntervals.current = {};
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <BattleHeader 
        timeRemaining={battleStarted ? timeRemaining : 20} 
        isCountdown={false}
      />
      
      <View style={styles.networkContainer}>
        <BattleNetwork
          nodes={nodes}
          controlledNodes={controlledNodes}
          opacity={networkOpacity}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT * 0.8}
          onNodeControlChange={handleNodeControlChange}
          nodeRefs={nodeRefs}
        />

        <BattleUnits
          deploymentOpacity={deploymentOpacity}
          battalionOpacity={battalionOpacity}
          userBattalions={userBattalions}
          enemyBattalions={enemyBattalions}
          battalionRefs={battalionRefs}
        />

        <BattleOverlays
          countdown={countdown}
          showResults={showResults}
          battleWinner={battleWinner}
          countdownOpacity={countdownOpacity}
          resultsOpacity={resultsOpacity}
          onClose={onClose}
        />
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  networkContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});