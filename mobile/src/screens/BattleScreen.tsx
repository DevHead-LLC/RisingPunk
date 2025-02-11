import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { NetworkNode } from '../components/battle/NetworkNode';
import { NetworkLines } from '../components/battle/NetworkLines';
import { BattleHeader } from '../components/battle/BattleHeader';
import { BattalionDeploymentZone } from '../components/battle/BattalionDeploymentZone';
import { BattleResultsOverlay } from '../components/battle/BattleResultsOverlay';

type Props = {
  onClose: () => void;
  onBattleComplete?: (winner: 'user' | 'enemy') => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BattleScreen = React.memo(({ onClose, onBattleComplete }: Props) => {
  const networkOpacity = useRef(new Animated.Value(0)).current;
  const [timeRemaining, setTimeRemaining] = useState(20);
  const timerRef = useRef<NodeJS.Timeout>();
  const [battleComplete, setBattleComplete] = useState(false);
  const [battleWinner, setBattleWinner] = useState<'user' | 'enemy' | null>(null);
  const resultsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start battle animations
    Animated.sequence([
      Animated.timing(networkOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Start countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleBattleComplete('user'); // Temporary: Always declare user as winner
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

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
    { x: SCREEN_WIDTH * 0.15, y: SCREEN_HEIGHT * 0.3 },
    { x: SCREEN_WIDTH * 0.15, y: SCREEN_HEIGHT * 0.5 },
    { x: SCREEN_WIDTH * 0.15, y: SCREEN_HEIGHT * 0.7 },
    
    // Middle nodes
    { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.3 },
    { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.5 },
    { x: SCREEN_WIDTH * 0.5, y: SCREEN_HEIGHT * 0.7 },
    
    // Right side (enemy) nodes
    { x: SCREEN_WIDTH * 0.85, y: SCREEN_HEIGHT * 0.3 },
    { x: SCREEN_WIDTH * 0.85, y: SCREEN_HEIGHT * 0.5 },
    { x: SCREEN_WIDTH * 0.85, y: SCREEN_HEIGHT * 0.7 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BattleHeader timeRemaining={timeRemaining} />
      
      <Animated.View 
        style={[
          styles.networkContainer,
          { opacity: networkOpacity }
        ]}
      >
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
            isActive={index < 3} // Initially activate user's nodes
          />
        ))}
      </Animated.View>
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
      {battleComplete && battleWinner && (
        <BattleResultsOverlay
          winner={battleWinner}
          opacity={resultsOpacity}
          onContinue={onClose}
        />
      )}
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  }
}); 