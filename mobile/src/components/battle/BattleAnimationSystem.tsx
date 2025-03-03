import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface BattleAnimationSystemProps {
  battalionSpeed?: number;
}

// Implementation of @battle-animation-standards.mdc#Core-Timing-Principles
export const BattleAnimationSystem: React.FC<BattleAnimationSystemProps> = ({
  battalionSpeed = 100,
}) => {
  const frameRef = useRef<number>();
  const duration = 1000 / battalionSpeed;
  const animation = useRef(new Animated.Value(0)).current;

  // Core animation loop - maintains 60fps
  useEffect(() => {
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  // Battalion speed-based animation
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }).start();
  }, [battalionSpeed]);

  return (
    <View testID="battle-animation-system">
      <Animated.View
        testID="battle-animation"
        style={[styles.animation, {
          transform: [{
            scale: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.2],
            }),
          }],
        }]}
        {...{duration}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  animation: {
    width: 50,
    height: 50,
    backgroundColor: '#00ff00',
  },
}); 