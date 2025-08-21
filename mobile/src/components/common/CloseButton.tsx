import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface CloseButtonProps {
  onPress: () => void;
}

export const CloseButton = ({ onPress }: CloseButtonProps) => {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity
      style={[styles.closeButton, { 
        backgroundColor: colors.primary,
        borderColor: colors.secondary,
      }]}
      onPress={onPress}
      testID="close-button"
    >
      <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
    </TouchableOpacity>
  );
};

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
    borderWidth: 2,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 28,
    marginTop: -2,
  },
});
