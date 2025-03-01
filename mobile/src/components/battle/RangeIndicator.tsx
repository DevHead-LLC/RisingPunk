/**
 * @component RangeIndicator
 * @description Renders the attack range circle for a battalion
 * 
 * @important This component handles range visualization
 * @maintainer Keep range rendering logic isolated here
 * @performance Uses native driver for smooth animations
 */

import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BattalionPosition } from '../../types/battle';

type Props = {
  battalion: BattalionPosition;
  isUser: boolean;
  opacity?: Animated.Value;
};

export const RangeIndicator = React.memo(({ battalion, isUser, opacity = new Animated.Value(1) }: Props) => {
  // Get range based on battalion type
  const range = battalion.type === 'phreak' ? 9 : 
                battalion.type === 'guardian' ? 4 : 
                5; // breacher

  // Convert range to screen units (1 range unit = 20px)
  const diameter = range * 40; // 20px * 2 for radius->diameter

  return (
    <Animated.View 
      testID="range-circle"
      style={[
        styles.rangeCircle,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          opacity: opacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.2]
          }),
          backgroundColor: isUser ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
          transform: [
            { translateX: battalion.position.x - diameter / 2 },
            { translateY: battalion.position.y - diameter / 2 }
          ]
        }
      ]} 
    />
  );
});

const styles = StyleSheet.create({
  rangeCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'none'
  }
}); 