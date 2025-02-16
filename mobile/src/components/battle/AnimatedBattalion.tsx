import React, { useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { BOT_CATEGORIES } from '../../screens/DigitalBarracksScreen';

type Props = {
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  position: Animated.ValueXY;
  isUser: boolean;
  health?: number;
  onAttackComplete?: () => void;
};

type BattalionRef = {
  triggerAttackAnimation: () => void;
};

export const AnimatedBattalion = React.forwardRef<BattalionRef, Props>(({ type, quantity, position, isUser, health = 100, onAttackComplete }: Props, ref) => {
  const rangeSize = BOT_CATEGORIES[type].stats.range * 30;
  const offset = rangeSize / 2 - 10; // Half of range size minus half of battalion size (20/2)
  const attackFlash = useRef(new Animated.Value(0)).current;

  const triggerAttackAnimation = () => {
    Animated.sequence([
      Animated.timing(attackFlash, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(attackFlash, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      onAttackComplete?.();
    });
  };

  // Expose the triggerAttackAnimation function via ref
  React.useImperativeHandle(ref, () => ({
    triggerAttackAnimation
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y }
          ]
        }
      ]}
    >
      {/* Attack Range Indicator */}
      <View style={[
        styles.rangeIndicator,
        {
          width: rangeSize,
          height: rangeSize,
          borderRadius: rangeSize / 2,
          backgroundColor: isUser ? 'rgba(71, 23, 246, 0.05)' : 'rgba(255, 65, 65, 0.05)',
          borderColor: isUser ? 'rgba(71, 23, 246, 0.1)' : 'rgba(255, 65, 65, 0.1)',
          left: -offset,
          top: -offset
        }
      ]} />

      <View style={styles.healthBarContainer}>
        <View style={[styles.healthBar, { width: `${health}%` }]} />
      </View>
      
      <Animated.View style={[
        styles.battalion,
        styles[type],
        isUser ? styles.userBattalion : styles.enemyBattalion,
        {
          backgroundColor: attackFlash.interpolate({
            inputRange: [0, 1],
            outputRange: ['transparent', isUser ? '#4717F680' : '#FF414180']
          })
        }
      ]}>
        <Text style={[
          styles.quantityText,
          type === 'breacher' && styles.rotatedText
        ]}>
          {quantity}
        </Text>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  healthBarContainer: {
    position: 'absolute',
    top: -9,
    width: '100%',
    height: 2,
    backgroundColor: '#333333',
    borderRadius: 1,
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#00FF00',
    borderRadius: 1,
  },
  battalion: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userBattalion: {
    borderColor: '#4717F6',
  },
  enemyBattalion: {
    borderColor: '#FF4141',
  },
  breacher: {
    transform: [{ rotate: '45deg' }],
  },
  guardian: {
    borderRadius: 4,
  },
  phreak: {
    borderRadius: 20,
  },
  quantityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rotatedText: {
    transform: [{ rotate: '-45deg' }]
  },
  rangeIndicator: {
    position: 'absolute',
    borderWidth: 1,
    left: -15,
    top: -15,
    zIndex: -1,
  },
}); 