/**
 * @component BattalionVisual
 * @description Renders a single battalion unit with animations
 * 
 * @important This component handles battalion visualization
 * @maintainer Keep battalion rendering logic isolated here
 * @performance Critical for battle performance with multiple battalions
 */

import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { BattalionPosition } from '../../types/battle';
import { COLORS } from '../../styles/theme';

type Props = {
  battalion: BattalionPosition;
  isUser: boolean;
  opacity?: number | Animated.Value;
};

export const BattalionVisual = React.memo(({ battalion, isUser, opacity = new Animated.Value(1) }: Props) => {
  // IMPORTANT: Keep transform calculations for smooth animations
  return (
    <Animated.View style={[
      styles.battalion,
      {
        backgroundColor: isUser ? COLORS.primary : COLORS.error,
        opacity,
        transform: [
          { translateX: battalion.position.x },
          { translateY: battalion.position.y }
        ]
      }
    ]}>
      <Animated.Text style={styles.quantity}>
        {battalion.quantity}
      </Animated.Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  battalion: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  }
}); 