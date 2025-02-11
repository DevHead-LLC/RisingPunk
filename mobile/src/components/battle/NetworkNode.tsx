import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../styles/theme';

type Props = {
  x: number;
  y: number;
  size?: number;
  isActive?: boolean;
};

export const NetworkNode = React.memo(({ x, y, size = 12, isActive = false }: Props) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      })
    ]);

    Animated.loop(pulse).start();
  }, []);

  return (
    <View style={[
      styles.node,
      {
        left: x - size/2,
        top: y - size/2,
        width: size,
        height: size,
        backgroundColor: isActive ? COLORS.primary : COLORS.secondary
      }
    ]}>
      <Animated.View style={[
        styles.pulse,
        {
          opacity: pulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.2, 0.5]
          }),
          transform: [{
            scale: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.3]
            })
          }]
        }
      ]} />
    </View>
  );
});

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  pulse: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    position: 'absolute',
  }
}); 