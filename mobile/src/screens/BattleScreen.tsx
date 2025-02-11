import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Animated } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { NetworkNode } from '../components/battle/NetworkNode';

type Props = {
  onClose: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BattleScreen = React.memo(({ onClose }: Props) => {
  const networkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade in network
      Animated.timing(networkOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

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
      <Animated.View 
        style={[
          styles.networkContainer,
          { opacity: networkOpacity }
        ]}
      >
        {nodes.map((node, index) => (
          <NetworkNode 
            key={index}
            x={node.x}
            y={node.y}
            isActive={index < 3} // Initially activate user's nodes
          />
        ))}
      </Animated.View>
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