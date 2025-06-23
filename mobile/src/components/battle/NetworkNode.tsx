import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../styles/theme';

type Props = {
  x: number;
  y: number;
  size?: number;
  isActive?: boolean;
  controlState: 'user' | 'enemy' | 'neutral';
  health?: number;
  controlProgress?: number;
  isLocked?: boolean;
  onControlStateChange?: (newState: 'user' | 'enemy') => void;
};

type NodeRef = {
  triggerDamageAnimation: () => void;
  applyDamage: (damage: number, isUser: boolean) => boolean;
};

// CLARIFICATION: Control state is only relevant to neutral nodes (3, 4, 5).
// User starts with 0, 1, 2; enemy with 6, 7, 8. Once owned, control cannot be taken by the other party.
export const NetworkNode = React.forwardRef<NodeRef, Props>(({ x, y, size = 12, isActive = false, controlState, health, controlProgress = 0, isLocked = false, onControlStateChange }, ref) => {
  // CHECK: Ensure there is only one source of truth for control state and progress bar/capture logic.
  // This should not be duplicated between NetworkNode, BattleNetwork, and BattleScreen.
  const [currentProgress, setCurrentProgress] = useState(controlProgress);
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

  const applyDamage = (damage: number, isUser: boolean) => {
    if (isLocked) return false;
    
    const progressChange = (damage / (health || 1)) * 100;
    const newProgress = currentProgress + (isUser ? progressChange : -progressChange);
    
    if (Math.abs(newProgress) >= 100) {
      const newState = newProgress > 0 ? 'user' : 'enemy';
      onControlStateChange?.(newState);
      return false;
    }
    
    setCurrentProgress(newProgress);
    return true;
  };

  React.useImperativeHandle(ref, () => ({
    triggerDamageAnimation,
    applyDamage
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
        borderColor: controlState === 'user'
          ? '#4717F6'  // User blue border
          : controlState === 'enemy'
          ? '#FF4141'  // Enemy red border
          : COLORS.primary,  // Neutral border
      }
    ]}>
      {/* Base color layer */}
      <Animated.View style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: controlState === 'user' 
            ? 'rgba(71, 23, 246, 0.9)'  // User blue
            : controlState === 'enemy'
            ? 'rgba(255, 65, 65, 0.9)'  // Enemy red
            : COLORS.secondary,          // Neutral color
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
        <View style={[styles.progressBarContainer, {
          width: size * 4,
          left: -(size * 1.6), // This centers it since width is 4x size and node is at center
          top: -10,
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        }]}>
          {/* Background bar */}
          <View style={styles.progressBarBackground} />
          
          {/* Progress fill */}
          <Animated.View 
            style={[
              styles.progressBarFill,
              {
                width: `${Math.abs(currentProgress)}%`,
                left: currentProgress < 0 ? 'auto' : 0,
                right: currentProgress < 0 ? 0 : 'auto',
                backgroundColor: currentProgress > 0 
                  ? 'rgba(71, 23, 246, 0.9)' // Brighter user color
                  : 'rgba(255, 65, 65, 0.9)', // Brighter enemy color
              }
            ]} 
          />
          
          {/* Bar border overlay */}
          <View style={styles.progressBarBorder} />
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
    height: 4, // Slightly taller
    top: -10,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker background
    borderRadius: 3,
  },
  progressBarFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  progressBarBorder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Subtle border
    backgroundColor: 'transparent',
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