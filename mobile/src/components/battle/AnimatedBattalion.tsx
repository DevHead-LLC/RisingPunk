import React, { useRef } from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';
import { BOT_CATEGORIES } from '../../screens/DigitalBarracksScreen';

type Props = {
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  position: Animated.ValueXY;
  isUser: boolean;
  health?: number;
  mark?: number;
  onAttackComplete?: () => void;
  onTargetBattalion?: (targetBattalion: any) => void;
};

// IMPORTANT: Export the ref type for use in other components
export type BattalionRef = {
  triggerAttackAnimation: () => void;
  triggerDamageAnimation: () => void;
} | null;

// IMPORTANT: Use forwardRef to properly type the ref
export const AnimatedBattalion = React.memo(React.forwardRef<BattalionRef, Props>((props, ref) => {
  const {
    type,
    quantity,
    position,
    isUser,
    health,
    mark = 1,
    onAttackComplete,
  } = props;

  // Force re-render when health changes
  const healthPercentage = Math.max(0, Math.min(100, health || 100));
  const battalionId = `${isUser ? 'user' : 'enemy'}-${type}-mk${mark}`;
  
  // Only log critical health (25% or less)
  if (healthPercentage <= 25) {
    console.log(`[Health] ${battalionId} critical: ${healthPercentage}%`);
  }

  const rangeSize = BOT_CATEGORIES[type].stats.range * 30;
  const offset = rangeSize / 2 - 10; // Half of range size minus half of battalion size (20/2)
  const attackFlash = useRef(new Animated.Value(0)).current;
  const damageFlash = useRef(new Animated.Value(0)).current;

  // Implementation of triggerAttackAnimation
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

  const triggerDamageAnimation = () => {
    Animated.sequence([
      Animated.timing(damageFlash, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(damageFlash, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      })
    ]).start();
  };

  // Expose the triggerAttackAnimation method via ref
  React.useImperativeHandle(ref, () => ({
    triggerAttackAnimation,
    triggerDamageAnimation,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
          ],
        },
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

      {/* Health Bar */}
      <View style={styles.healthBarContainer}>
        <View style={[
          styles.healthBar, 
          { 
            width: `${healthPercentage}%`,
            backgroundColor: isUser ? '#47F729' : '#FF4141'
          }
        ]} />
      </View>

      {/* Type tag - Moved outside battalion container */}
      <View style={styles.typeTagContainer}>
        <Text style={styles.typeTagText}>
          {type === 'breacher' ? 'B' : type === 'guardian' ? 'G' : 'P'}
        </Text>
      </View>

      {/* Mark indicator - Moved outside battalion container */}
      <View style={styles.markContainer}>
        <Text style={styles.markText}>Mk{mark}</Text>
      </View>
      
      <View style={[
        styles.battalion,
        styles[type],
        isUser ? styles.userBattalion : styles.enemyBattalion,
        type === 'breacher' && {
          transform: [{ rotate: '45deg' }],
          overflow: 'hidden'
        }
      ]}>
        {/* Base color layer */}
        <View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'transparent',
            borderRadius: type === 'breacher' ? 0 : type === 'guardian' ? 4 : 20,
            zIndex: 1
          }
        ]} />

        {/* Red flash overlay */}
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: Animated.add(
              attackFlash.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1]
              }),
              damageFlash.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 2]
              })
            ).interpolate({
              inputRange: [0, 1, 2],
              outputRange: [
                'transparent',
                isUser ? '#4717F680' : '#FF414180',
                '#FF0000'
              ]
            }),
            borderRadius: type === 'breacher' ? 0 : type === 'guardian' ? 4 : 20,
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
            borderRadius: type === 'breacher' ? 0 : type === 'guardian' ? 4 : 20,
            zIndex: 3
          }
        ]} />
        <Text style={[styles.quantityText, type === 'breacher' && styles.rotatedText, { zIndex: 4 }]}>
          {quantity}
        </Text>
      </View>
    </Animated.View>
  );
}), (prevProps, nextProps) => {
  // Only re-render if these props change
  const propsEqual = prevProps.quantity === nextProps.quantity &&
         prevProps.health === nextProps.health &&
         prevProps.isUser === nextProps.isUser &&
         prevProps.type === nextProps.type &&
         prevProps.mark === nextProps.mark;
  
  // Only log significant health changes (>25%) with battalion identification
  if (prevProps.health !== nextProps.health) {
    const prevHealth = prevProps.health || 100;
    const nextHealth = nextProps.health || 100;
    const battalionId = `${nextProps.isUser ? 'user' : 'enemy'}-${nextProps.type}-mk${nextProps.mark || 1}`;
    if (Math.abs(prevHealth - nextHealth) >= 25) {
      console.log(`[Health] ${battalionId} health changed: ${prevHealth}% → ${nextHealth}%`);
    }
    return false;
  }
  
  return propsEqual && prevProps.position === nextProps.position;
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  healthBarContainer: {
    position: 'absolute',
    top: -8,
    left: -15,
    width: 50,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    zIndex: 11
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#47F729',
    borderRadius: 2,
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
  markContainer: {
    position: 'absolute',
    top: -15,
    right: -15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 2,
    zIndex: 12
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  typeTagContainer: {
    position: 'absolute',
    top: -15,
    left: -15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 2,
    zIndex: 12
  },
  typeTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
}); 