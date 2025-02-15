import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { NetworkNode } from '../components/battle/NetworkNode';
import { NetworkLines } from '../components/battle/NetworkLines';
import { BattleHeader } from '../components/battle/BattleHeader';
import { BattalionDeploymentZone } from '../components/battle/BattalionDeploymentZone';
import { BattleResultsOverlay } from '../components/battle/BattleResultsOverlay';
import { AnimatedBattalion } from '../components/battle/AnimatedBattalion';
import { CountdownOverlay } from '../components/battle/CountdownOverlay';

type Props = {
  onClose: () => void;
  onBattleComplete?: (winner: 'user' | 'enemy') => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BattalionPosition {
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  nodeIndex: number;
  position: Animated.ValueXY;
}

export const BattleScreen = React.memo(({ onClose, onBattleComplete }: Props) => {
  const networkOpacity = useRef(new Animated.Value(0)).current;
  const [timeRemaining, setTimeRemaining] = useState(20);
  const timerRef = useRef<NodeJS.Timeout>();
  const [battleComplete, setBattleComplete] = useState(false);
  const [battleWinner, setBattleWinner] = useState<'user' | 'enemy' | null>(null);
  const resultsOpacity = useRef(new Animated.Value(0)).current;
  const [userBattalions, setUserBattalions] = useState<BattalionPosition[]>([
    {
      type: 'breacher',
      quantity: 5,
      nodeIndex: 0,
      position: new Animated.ValueXY({ 
        x: 20,
        y: SCREEN_HEIGHT * 0.225
      })
    },
    {
      type: 'guardian',
      quantity: 3,
      nodeIndex: 1,
      position: new Animated.ValueXY({ 
        x: 20,
        y: SCREEN_HEIGHT * 0.5
      })
    },
    {
      type: 'phreak',
      quantity: 4,
      nodeIndex: 2,
      position: new Animated.ValueXY({ 
        x: 20,
        y: SCREEN_HEIGHT * 0.775
      })
    }
  ]);

  const [enemyBattalions, setEnemyBattalions] = useState<BattalionPosition[]>([
    {
      type: 'breacher',
      quantity: 4,
      nodeIndex: 6,
      position: new Animated.ValueXY({ 
        x: SCREEN_WIDTH - 165,
        y: SCREEN_HEIGHT * 0.225
      })
    },
    {
      type: 'guardian',
      quantity: 4,
      nodeIndex: 7,
      position: new Animated.ValueXY({ 
        x: SCREEN_WIDTH - 165,
        y: SCREEN_HEIGHT * 0.5
      })
    },
    {
      type: 'phreak',
      quantity: 3,
      nodeIndex: 8,
      position: new Animated.ValueXY({ 
        x: SCREEN_WIDTH - 165,
        y: SCREEN_HEIGHT * 0.775
      })
    }
  ]);

  const [battleStarted, setBattleStarted] = useState(false);
  const deploymentOpacity = useRef(new Animated.Value(1)).current;
  const battalionOpacity = useRef(new Animated.Value(0)).current;
  const [controlledNodes, setControlledNodes] = useState<number[]>([0, 1, 2]); // User starts controlling left nodes
  const [countdown, setCountdown] = useState(3);
  const countdownOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Show battlefield immediately
    networkOpacity.setValue(1);
    
    // Initial countdown
    const countdownTimer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 2) { // Start transition on 1
          clearInterval(countdownTimer);
          // Coordinate all animations
          Animated.parallel([
            // Fade out countdown
            Animated.timing(countdownOpacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            // Transition battalions
            Animated.parallel([
              Animated.timing(deploymentOpacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(battalionOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              })
            ])
          ]).start(() => {
            setBattleStarted(true);
            startBattleTimer();
          });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, []);

  useEffect(() => {
    if (battleStarted) {
      // User battalion movement
      userBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 0: availableNodes = [3, 4]; break;
          case 1: availableNodes = [3, 4, 5]; break;
          case 2: availableNodes = [4, 5]; break;
        }
        
        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        const targetNode = nodes[targetNodeIndex];
        
        Animated.timing(battalion.position, {
          toValue: { x: targetNode.x - 10, y: targetNode.y - 10 },
          duration: 2000,
          useNativeDriver: true
        }).start();
      });

      // Enemy battalion movement
      enemyBattalions.forEach(battalion => {
        let availableNodes: number[] = [];
        switch (battalion.nodeIndex) {
          case 6: availableNodes = [3, 4]; break;    // Top right to middle
          case 7: availableNodes = [3, 4, 5]; break; // Middle right to middle
          case 8: availableNodes = [4, 5]; break;    // Bottom right to middle
        }
        
        const targetNodeIndex = availableNodes[Math.floor(Math.random() * availableNodes.length)];
        const targetNode = nodes[targetNodeIndex];
        
        Animated.timing(battalion.position, {
          toValue: { x: targetNode.x - 10, y: targetNode.y - 10 },
          duration: 2000,
          useNativeDriver: true
        }).start();
      });
    }
  }, [battleStarted]);

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
    setBattleComplete(true);
    setBattleWinner(winner);
    Animated.timing(resultsOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  };

  const nodes = [
    // Left side (user) nodes
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.25 },     // Top
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.525 },   // Middle
    { x: SCREEN_WIDTH * 0.0347, y: SCREEN_HEIGHT * 0.8 },    // Bottom
    
    // Middle nodes
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.375 },      // Top
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.525 },    // Middle
    { x: SCREEN_WIDTH * 0.425, y: SCREEN_HEIGHT * 0.675 },     // Bottom
    
    // Right side (enemy) nodes
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.25 },     // Top
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.525 },   // Middle
    { x: SCREEN_WIDTH * 0.8225, y: SCREEN_HEIGHT * 0.8 },    // Bottom
  ];

  

  // Movement animation function
  const moveBattalion = (battalion: BattalionPosition, targetNode: number) => {
    const targetX = nodes[targetNode].x;
    const targetY = nodes[targetNode].y;

    return Animated.timing(battalion.position, {
      toValue: { x: targetX, y: targetY },
      duration: 1000,
      useNativeDriver: true,
    });
  };

  const findAvailableNodes = (currentNodeIndex: number): number[] => {
    // Get connections from NetworkLines
    const connections = [
      // Horizontal connections
      [0, 3], [3, 6], // Top row
      [1, 4], [4, 7], // Middle row
      [2, 5], [5, 8], // Bottom row
      // Diagonal connections
      [0, 4], [1, 3], [1, 5], [2, 4],
      [3, 7], [4, 6], [4, 8], [5, 7]
    ];

    // Find all connections that include our current node
    return connections
      .filter(([from, to]) => from === currentNodeIndex || to === currentNodeIndex)
      .map(([from, to]) => from === currentNodeIndex ? to : from);
  };

  return (
    <SafeAreaView style={styles.container}>
      <BattleHeader 
        timeRemaining={battleStarted ? timeRemaining : 20} 
        isCountdown={false}
      />
      
      <View style={styles.networkContainer}>
        <Animated.View style={{ opacity: networkOpacity }}>
          <NetworkLines 
            nodes={nodes}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT * 0.8}
          />
          {nodes.map((node, index) => (
            <NetworkNode 
              key={index}
              x={node.x}
              y={node.y}
              isActive={controlledNodes.includes(index)}
            />
          ))}
        </Animated.View>

        {/* Deployment zones */}
        <Animated.View style={[styles.overlayContainer, { opacity: deploymentOpacity }]}>
          <BattalionDeploymentZone
            side="user"
            battalions={[
              { type: 'breacher', quantity: 5 },
              { type: 'guardian', quantity: 3 },
              { type: 'phreak', quantity: 4 }
            ]}
          />
          <BattalionDeploymentZone
            side="enemy"
            battalions={[
              { type: 'breacher', quantity: 4 },
              { type: 'guardian', quantity: 4 },
              { type: 'phreak', quantity: 3 }
            ]}
          />
        </Animated.View>

        {/* Animated battalions */}
        <Animated.View style={[styles.overlayContainer, { opacity: battalionOpacity }]}>
          {userBattalions.map((battalion, index) => (
            <AnimatedBattalion
              key={`user-${index}`}
              type={battalion.type}
              quantity={battalion.quantity}
              position={battalion.position}
              isUser={true}
            />
          ))}
          
          {enemyBattalions.map((battalion, index) => (
            <AnimatedBattalion
              key={`enemy-${index}`}
              type={battalion.type}
              quantity={battalion.quantity}
              position={battalion.position}
              isUser={false}
            />
          ))}
        </Animated.View>
      </View>

      {battleComplete && battleWinner && (
        <BattleResultsOverlay
          winner={battleWinner}
          opacity={resultsOpacity}
          onContinue={onClose}
        />
      )}

      <CountdownOverlay 
        countdown={countdown} 
        opacity={countdownOpacity}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  networkContainer: {
    flex: 1,
    width: '100%',
    height: SCREEN_HEIGHT * 0.8,
    position: 'relative',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
}); 