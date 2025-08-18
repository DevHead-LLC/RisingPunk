import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Add padding to keep animation on screen
const PADDING = 20;
const ANIMATION_WIDTH = width - (PADDING * 2);
const ANIMATION_HEIGHT = height - (PADDING * 2);

interface LevelUpAnimationProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
}

export const LevelUpAnimation: React.FC<LevelUpAnimationProps> = ({
  isVisible,
  onAnimationComplete
}) => {
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const popupAnimation = useRef(new Animated.Value(0)).current;
  const popupOpacity = useRef(new Animated.Value(0)).current;

  // Calculate the position along the border path
  const getBorderPosition = (progress: number) => {
    const totalPerimeter = 2 * (ANIMATION_WIDTH + ANIMATION_HEIGHT);
    const currentDistance = progress * totalPerimeter;
    
    // Top edge (0 to ANIMATION_WIDTH)
    if (currentDistance <= ANIMATION_WIDTH) {
      return { x: currentDistance, y: 0 };
    }
    
    // Right edge (ANIMATION_WIDTH to ANIMATION_WIDTH + ANIMATION_HEIGHT)
    if (currentDistance <= ANIMATION_WIDTH + ANIMATION_HEIGHT) {
      return { x: ANIMATION_WIDTH, y: currentDistance - ANIMATION_WIDTH };
    }
    
    // Bottom edge (ANIMATION_WIDTH + ANIMATION_HEIGHT to 2*ANIMATION_WIDTH + ANIMATION_HEIGHT)
    if (currentDistance <= 2 * ANIMATION_WIDTH + ANIMATION_HEIGHT) {
      return { x: ANIMATION_WIDTH - (currentDistance - (ANIMATION_WIDTH + ANIMATION_HEIGHT)), y: ANIMATION_HEIGHT };
    }
    
    // Left edge (remaining distance)
    return { x: 0, y: ANIMATION_HEIGHT - (currentDistance - (2 * ANIMATION_WIDTH + ANIMATION_HEIGHT)) };
  };



  useEffect(() => {
    if (isVisible) {
      // Reset animations
      borderAnimation.setValue(0);
      popupAnimation.setValue(0);
      popupOpacity.setValue(0);

      // Start border animation (circle around screen)
      Animated.timing(borderAnimation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      // Start popup animation after border starts
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(popupAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(popupOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        ]).start();

        // Fade out popup after 2 seconds
        setTimeout(() => {
          Animated.timing(popupOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            onAnimationComplete();
          });
        }, 2000);
      }, 300);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  // Create border position using custom interpolation
  const borderX = borderAnimation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, ANIMATION_WIDTH, ANIMATION_WIDTH, 0, 0],
  });

  const borderY = borderAnimation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 0, ANIMATION_HEIGHT, ANIMATION_HEIGHT, 0],
  });

  const popupScale = popupAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Border animation */}
      <View style={[styles.borderContainer, { padding: PADDING }]}>
        <Animated.View
          style={[
            styles.border,
            {
              transform: [
                { translateX: borderX },
                { translateY: borderY }
              ],
            },
          ]}
        />
      </View>

      {/* Level Up popup */}
      <Animated.View
        style={[
          styles.popupContainer,
          {
            opacity: popupOpacity,
            transform: [{ scale: popupScale }],
          },
        ]}
      >
        <View style={styles.popup}>
          <Text style={styles.levelUpText}>Level Up!</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  borderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 6,
    height: 6,
    backgroundColor: '#00ff00',
    borderRadius: 3,
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
  },
  popupContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#00ff00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  levelUpText: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
