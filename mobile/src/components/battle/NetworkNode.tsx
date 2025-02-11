import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../../styles/theme';

type Props = {
  x: number;
  y: number;
  size?: number;
  isActive?: boolean;
};

export const NetworkNode = React.memo(({ x, y, size = 12, isActive = false }: Props) => {
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
      <View style={styles.pulse} />
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
  },
  pulse: {
    width: '70%',
    height: '70%',
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
  }
}); 