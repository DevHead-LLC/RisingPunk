import React, {memo} from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {COLORS, SIZING} from '../../styles/theme';

type DisconnectButtonProps = {
  onPress: () => void;
};

export const DisconnectButton = memo(function DisconnectButton({ onPress }: DisconnectButtonProps) {
  return (
    <TouchableOpacity style={styles.logoutButton} onPress={onPress}>
      <Text style={styles.logoutText}>DISCONNECT</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  logoutButton: {
    position: 'absolute',
    bottom: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: SIZING.font.small,
    letterSpacing: 1,
  },
}); 