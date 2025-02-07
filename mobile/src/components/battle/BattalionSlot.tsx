import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type Props = {
  name: string;
  isLocked?: boolean;
  onPress?: () => void;
};

export const BattalionSlot = React.memo(({ 
  name, 
  isLocked = false,
  onPress 
}: Props) => {
  if (isLocked) {
    return (
      <View style={[styles.slot, styles.lockedSlot]}>
        <Text style={[styles.slotText, styles.lockedText]}>BATTALION {name}</Text>
        <Text style={[styles.deployText, styles.lockedText]}>+ Deploy</Text>
        <Text style={styles.lockText}>🔒</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.slot, styles.activeSlot]}
      onPress={onPress}
    >
      <Text style={styles.slotText}>BATTALION {name}</Text>
      <Text style={styles.deployText}>+ Deploy</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  slot: {
    height: 80,
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSlot: {
    borderColor: '#4717F6',
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
  },
  lockedSlot: {
    borderColor: 'rgba(71, 23, 246, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  slotText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  deployText: {
    color: '#4717F6',
    fontSize: SIZING.font.small,
    marginTop: 4,
  },
  lockedText: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  lockText: {
    position: 'absolute',
    right: SIZING.spacing.sm,
    top: SIZING.spacing.sm,
    fontSize: SIZING.font.small,
  },
}); 