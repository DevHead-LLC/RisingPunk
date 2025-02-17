import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../styles/theme';

type Props = {
  x: number;
  y: number;
  size?: number;
  isActive?: boolean;
  controlState: 'user' | 'enemy' | 'neutral';
  controlProgress?: number;
};

type NodeRef = {
  triggerDamageAnimation: () => void;
};

export const NetworkNode = React.forwardRef<NodeRef, Props>(({ x, y, size = 12, isActive = false, controlState, controlProgress = 0 }, ref) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const damageFlash = useRef(new Animated.Value(0)).current;

  const triggerDamageAnimation = () => {
    Animated.sequence([
      Animated.timing(damageFlash, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(damageFlash, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  React.useImperativeHandle(ref, () => ({
    triggerDamageAnimation
  }));

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

  const barWidth = size * 3; // Make the bar wider than the node
  const barHeight = 2; // Thin line

  return (
    <View style={[
      styles.node,
      {
        left: x - size/2,
        top: y - size/2,
        width: size,
        height: size,
        borderWidth: 2,
        borderColor: COLORS.primary,
      }
    ]}>
      {/* Base color layer */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: isActive ? COLORS.primary : COLORS.secondary,
          borderRadius: 999,
          zIndex: 1
        }
      ]} />
      {/* Red flash overlay */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: damageFlash.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', '#FF0000']
          }),
          borderRadius: 999,
          zIndex: 2
        }
      ]} />
      {/* White border flash overlay */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {
          borderColor: '#FFFFFF',
          borderWidth: 2,
          opacity: damageFlash,
          backgroundColor: 'transparent',
          borderRadius: 999,
          zIndex: 3
        }
      ]} />
      
      <Animated.View style={[styles.pulse, {
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
      }]} />
      
      {/* Control Progress Bar */}
      <View style={[
        styles.progressBarContainer,
        {
          width: barWidth,
          height: barHeight,
          left: -((barWidth - size) / 1.75),
          top: (size - barHeight) / 2.75,
          transform: [{ translateX: 0 }, { translateY: 0 }] // Ensure no additional offsets
        }
      ]}>
        <View style={[
          styles.progressBar,
          {
            width: `${controlProgress}%`,
            backgroundColor: controlState === 'user' 
              ? '#4717F6' 
              : controlState === 'enemy' 
                ? '#FF4141' 
                : '#333333'
          }
        ]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    borderRadius: 999,
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
  },
  progressBarContainer: {
    position: 'absolute',
    backgroundColor: '#333333',
    borderRadius: 1,
    overflow: 'hidden',
    alignSelf: 'center', // Help with horizontal centering
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  }
}); 