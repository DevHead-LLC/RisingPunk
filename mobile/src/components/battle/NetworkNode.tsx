import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
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
    // Create two separate animations for center and border
    const centerFlash = Animated.sequence([
      Animated.timing(damageFlash, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(damageFlash, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]);

    const borderPulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.5, // Increased pulse scale
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]);

    // Run both animations together
    Animated.parallel([centerFlash, borderPulse]).start();
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
            outputRange: ['transparent', '#FF000099'] // Semi-transparent red
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
      
      {/* Control Progress Bar - Only show for neutral nodes */}
      {controlState === 'neutral' && (
        <View style={[
          styles.progressBarContainer,
          {
            width: barWidth,
            height: 16, // Taller to accommodate text
            left: -((barWidth - size) / 1.75),
            top: -(size + 8), // Position above the node
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }
        ]}>
          <View style={[
            styles.progressBar,
            {
              width: `${Math.abs(controlProgress)}%`,
              backgroundColor: controlProgress > 0 
                ? 'rgba(71, 23, 246, 0.8)' // User color
                : 'rgba(255, 65, 65, 0.8)', // Enemy color
            }
          ]} />
          <Text style={styles.progressText}>
            {`${Math.abs(controlProgress)}%`}
          </Text>
        </View>
      )}
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
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  progressBar: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    zIndex: 11,
  }
}); 