import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

interface CloseButtonProps {
  onPress: () => void;
}

export const CloseButton = ({ onPress }: CloseButtonProps) => (
  <TouchableOpacity
    style={styles.closeButton}
    onPress={onPress}
    testID="close-button"
  >
    <Text style={styles.closeButtonText}>×</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#b39ddb',
    borderWidth: 2,
    borderColor: COLORS.secondary,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 28,
    color: COLORS.background,
    marginTop: -2,
  },
});
