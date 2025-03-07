import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { BattleNetwork } from '../components/battle/BattleNetwork';
import { BattleHeader } from '../components/battle/BattleHeader';
import { BattleUnits } from '../components/battle/BattleUnits';
import { BattleOverlays } from '../components/battle/BattleOverlays';
import { useBattleAnimations } from '../hooks/useBattleAnimations';
import { useBattleMovementAndAttacks } from '../hooks/useBattleMovementAndAttacks';
import { BattlePhase } from '../hooks/useBattleStateMachine';

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

interface BattalionLosses {
  quantity: number;
  mark: number;
}

interface BattleLossTracker {
  user: { [battalionId: string]: BattalionLosses };
  enemy: { [battalionId: string]: BattalionLosses };
}

const calculateLossPoints = (losses: BattalionLosses) => {
  // Mark values: Mark 1 = 1pt, Mark 2 = 2pts, Mark 3 = 4pts, Mark 4 = 8pts
  return losses.quantity * Math.pow(2, losses.mark - 1);
};

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
  const [battleLosses, setBattleLosses] = useState<BattleLossTracker>({
    user: {},
    enemy: {}
  });

  const recordBattalionLoss = (
    side: 'user' | 'enemy',
    battalionId: string,
    quantity: number,
    mark: number
  ) => {
    setBattleLosses(prev => {
      const newLosses = { ...prev };
      if (!newLosses[side][battalionId]) {
        newLosses[side][battalionId] = { quantity: 0, mark };
      }
      newLosses[side][battalionId].quantity += quantity;
      return newLosses;
    });
  };

  // IMPORTANT: Use the new battle movement and attacks hook
  const {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    findNewTarget,
    setupAttacks
  } = useBattleMovementAndAttacks(
    battleStarted,
    nodes,
    userBattalions,
    enemyBattalions,
    setUserBattalions,
    setEnemyBattalions,
    recordBattalionLoss
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
          handleBattleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const calculateTotalLossPoints = (side: 'user' | 'enemy'): number => {
    return Object.values(battleLosses[side]).reduce((total, loss) => {
      return total + calculateLossPoints(loss);
    }, 0);
  };

  const determineVictor = () => {
    // Calculate loss points for each side
    const userPoints = calculateTotalLossPoints('user');
    const enemyPoints = calculateTotalLossPoints('enemy');
    
    if (userPoints === enemyPoints) {
      // Defending party wins ties
      return 'enemy';
    }
    return userPoints < enemyPoints ? 'user' : 'enemy';
  };

  const handleBattleComplete = () => {
    const winner = determineVictor();
    setBattleWinner(winner);
    showBattleResults(() => {
      setShowResults(true);
      onBattleComplete?.(winner);
    });
  };

  // Modify the countdown effect to initialize node health
  useEffect(() => {
    if (countdown === 3) {
      // Calculate total army health (75% of combined battalion health)
      const calculateNodeHealth = () => {
        let total = 0;
        userBattalions.forEach(battalion => {
          total += BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity;
        });
        enemyBattalions.forEach(battalion => {
          total += BOT_CATEGORIES[battalion.type].stats.health * battalion.quantity;
        });
        return Math.floor(total * 0.75); // 75% of total army health
      };

      const nodeHealth = calculateNodeHealth();
      // Initialize all nodes with health and control progress
      setNodes(prevNodes => prevNodes.map(node => ({
        ...node,
        health: nodeHealth,
        controlProgress: node.controlState === 'neutral' ? 0 : 
                        node.controlState === 'user' ? 100 : -100,
        isLocked: node.controlState !== 'neutral'
      })));
    }
  }, [countdown, userBattalions, enemyBattalions]);

  const handleNodeControlChange = (nodeIndex: number, newState: 'user' | 'enemy') => {
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

    // Clear attack intervals for battalions that were attacking this node
    allAffectedBattalions.forEach(({ key, interval }) => {
      if (interval) {
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
        timeRemaining={timeRemaining}
        opacity={battalionOpacity}
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
          phase={battleStarted ? 'active' : 'deployment'}
        />

        <BattleUnits
          deploymentOpacity={deploymentOpacity}
          battalionOpacity={battalionOpacity}
          userBattalions={userBattalions}
          enemyBattalions={enemyBattalions}
          battalionRefs={battalionRefs}
          setupAttacks={setupAttacks}
        />

        <BattleOverlays
          countdown={countdown}
          showResults={showResults}
          battleWinner={battleWinner}
          countdownOpacity={countdownOpacity}
          resultsOpacity={resultsOpacity}
          onClose={onClose}
          userLossPoints={calculateTotalLossPoints('user')}
          enemyLossPoints={calculateTotalLossPoints('enemy')}
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