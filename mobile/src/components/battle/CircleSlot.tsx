import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

export const CircleSlot = React.memo(() => {
  return (
    <View style={styles.container}>
      <Text style={styles.lockText}>🔒</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(71, 23, 246, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    fontSize: SIZING.font.small,
  },
}); 