import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { COLORS } from '../styles/theme';
import { BattleNetwork } from '../components/battle/BattleNetwork';
import { BattleHeader } from '../components/battle/BattleHeader';
import { BattleUnits } from '../components/battle/BattleUnits';
import { BattleOverlays } from '../components/battle/BattleOverlays';
import { useBattleCoordination } from '../hooks/useBattleCoordination';
import { useBattleStateMachine } from '../hooks/useBattleStateMachine';
import { BattalionPosition } from '../types/battle';
import { useBattleInitialization } from '../hooks/useBattleInitialization';

type Props = {
  onClose: () => void;
  onBattleComplete?: (winner: 'user' | 'enemy') => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  // CORRECTION_COMMENT: This screen should handle battles between a human player and an AI opponent.
  // Use the state machine as the single source of truth for animations and state
  const {
    // Animation values
    networkOpacity,
    deploymentOpacity,
    battalionOpacity,
    countdownOpacity,
    resultsOpacity,
    // State
    phase,
    countdown,
    // Functions
    startBattle,
    endBattle,
    showNetwork,
    showBattleResults,
  } = useBattleStateMachine();

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

  // CLARIFICATION_COMMENT: The movement and targeting logic in the useBattleCoordination hook must respect node ownership.
  // Once a node is owned (not neutral), it cannot be targeted by anyone nor can it be captured by the opposing party.
  // KEY_FEATURE_COMMENT: Battalions SHOULD move according to pathfinding. Currently, initial node targeting is random.
  // Upon retargeting, they should follow pathfinding logic within the hook.

  // IMPORTANT: Use the new battle movement and attacks hook
  const {
    battalionRefs,
    nodeRefs,
    attackIntervals,
    setupBattalionAttacks,
    findNewTarget,
    handleNodeCapture
  } = useBattleCoordination(
    battleStarted,
    nodes,
    userBattalions,
    enemyBattalions,
    setUserBattalions,
    setEnemyBattalions,
    recordBattalionLoss
  );

  // Create a wrapper function that adapts the signature for BattleUnits
  const setupAttacks = (
    battalion: BattalionPosition,
    targetBattalion: BattalionPosition,
    isUser: boolean
  ) => {
    // Use the setupBattalionAttacks function from the hook
    setupBattalionAttacks(battalion, targetBattalion, isUser);
  };

  const initializeBattle = () => {
    if (battleInitializedRef.current) return;
    battleInitializedRef.current = true;

    // Show battlefield immediately using the new hook
    showNetwork();
    
    // Use state machine to start battle countdown
    startBattle();
  };

  useEffect(() => {
    initializeBattle();
  }, []);

  // Listen for phase changes from state machine
  useEffect(() => {
    if (phase === 'active' && !battleStarted) {
      setBattleStarted(true);
      startBattleTimer();
    }
  }, [phase, battleStarted]);

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

  // MAIN_PURPOSE_COMMENT: The main purpose of the battle is to defeat enemy battalions.
  // Victory is determined by which side has sustained fewer losses when the battle ends.
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
    // KEY_FEATURE_COMMENT: The battle SHOULD also end if all of one side's battalions are defeated.
    // This is not yet implemented. The battle currently only ends when the timer runs out.
    const winner = determineVictor();
    setBattleWinner(winner);
    endBattle(winner);
    showBattleResults(() => {
      setShowResults(true);
      onBattleComplete?.(winner);
    });
  };

  // Modify the countdown effect to initialize node health
  useEffect(() => {
    if (countdown === 3) {
      // Use the centralized health calculation from useBattleInitialization
      const nodeHealth = calculateInitialHealth();
      // CLARIFICATION_COMMENT: Users "own" their initial nodes (left side), and enemies "own" theirs (right side). This initial ownership is permanent.
      // Initialize all nodes with health and control progress
      setNodes(prevNodes => prevNodes.map(node => ({
        ...node,
        health: nodeHealth,
        controlProgress: node.controlState === 'neutral' ? 0 : 
                        node.controlState === 'user' ? 100 : -100,
        isLocked: node.controlState !== 'neutral'
      })));
    }
  }, [countdown, userBattalions, enemyBattalions, calculateInitialHealth]);

  const handleNodeControlChange = (nodeIndex: number, newState: 'user' | 'enemy') => {
    // CLARIFICATION_COMMENT: When a neutral node is captured, ownership becomes permanent for the rest of the battle.
    // Owned nodes cannot be targeted or controlled by the opposing party.
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

    // Use the centralized node capture handler from the hook
    handleNodeCapture(nodeIndex, newState);
  };

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup is handled by the useBattleCoordination hook
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <BattleHeader
        timeRemaining={timeRemaining}
        isCountdown={countdown > 0}
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
          phase={phase}
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