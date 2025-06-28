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

// Tracks how many units of each battalion type were lost
interface BattalionLosses {
  quantity: number;
  mark: number;
}

// Keeps track of all losses for both sides during the battle
interface BattleLossTracker {
  user: { [battalionId: string]: BattalionLosses };
  enemy: { [battalionId: string]: BattalionLosses };
}

// Converts battalion losses into victory points (higher mark = more points)
const calculateLossPoints = (losses: BattalionLosses) => {
  // Mark values: Mark 1 = 1pt, Mark 2 = 2pts, Mark 3 = 4pts, Mark 4 = 8pts
  return losses.quantity * Math.pow(2, losses.mark - 1);
};

// Main battle screen that manages the entire battle flow
export const BattleScreen = React.memo(({ onClose, onBattleComplete }: Props) => {
  
  // Controls battle animations and state transitions
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

  // Sets up initial battle data (nodes, battalions, health)
  const {
    nodes,
    setNodes,
    userBattalions,
    setUserBattalions,
    enemyBattalions,
    setEnemyBattalions,
    calculateInitialHealth,
  } = useBattleInitialization();

  // Battle timer and state management
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

  // Records when battalions are destroyed for victory calculation
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
  
  // Handles all battalion movement, attacks, and targeting logic
  const {
    battalionRefs,
    nodeRefs,
    setupBattalionAttacks,
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

  // Connects BattleUnits component to the battle coordination hook
  const setupAttacks = (
    battalion: BattalionPosition,
    targetBattalion: BattalionPosition,
    isUser: boolean
  ) => {
    // Use the setupBattalionAttacks function from the hook
    setupBattalionAttacks(battalion, targetBattalion, isUser);
  };

  // Sets up the battle when the screen first loads
  const initializeBattle = () => {
    if (battleInitializedRef.current) return;
    battleInitializedRef.current = true;

    // Show battlefield immediately using the new hook
    showNetwork();
    
    // Use state machine to start battle countdown
    startBattle();
  };

  // Runs once when component mounts to start the battle
  useEffect(() => {
    initializeBattle();
  }, []);

  // Starts the battle timer when the countdown finishes
  useEffect(() => {
    if (phase === 'active' && !battleStarted) {
      setBattleStarted(true);
      startBattleTimer();
    }
  }, [phase, battleStarted]);

  // Creates a 20-second countdown timer for the battle
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

  // Adds up all loss points for one side
  const calculateTotalLossPoints = (side: 'user' | 'enemy'): number => {
    return Object.values(battleLosses[side]).reduce((total, loss) => {
      return total + calculateLossPoints(loss);
    }, 0);
  };
  
  // Determines who won based on total loss points
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

  // Ends the battle and shows results
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

  // Sets up node health when countdown is 3
  useEffect(() => {
    if (countdown === 3) {
      const nodeHealth = calculateInitialHealth();
      
      // Only neutral nodes get health - controlled nodes get 0 health
      setNodes(prevNodes => prevNodes.map(node => ({
        ...node,
        health: node.controlState === 'neutral' ? nodeHealth : 0,
        controlProgress: node.controlState === 'neutral' ? 0 : 
                        node.controlState === 'user' ? 100 : -100,
        isLocked: node.controlState !== 'neutral'
      })));
    }
  }, [countdown, userBattalions, enemyBattalions, calculateInitialHealth]);

  // Handles when a node is captured by either side
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

  // Cleans up when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup is handled by the useBattleCoordination hook
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Shows battle timer and countdown */}
      <BattleHeader
        timeRemaining={timeRemaining}
        isCountdown={countdown > 0}
        opacity={battalionOpacity}
      />
      
      <View style={styles.networkContainer}>
        {/* Shows the network of nodes and connections */}
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

        {/* Shows all the battalions and handles their attacks */}
        <BattleUnits
          deploymentOpacity={deploymentOpacity}
          battalionOpacity={battalionOpacity}
          userBattalions={userBattalions}
          enemyBattalions={enemyBattalions}
          battalionRefs={battalionRefs}
          setupAttacks={setupAttacks}
        />

        {/* Shows countdown overlay and battle results */}
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

// Styles for the battle screen layout
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