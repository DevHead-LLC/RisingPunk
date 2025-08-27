import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SkipButtonProps {
  onSkip: () => void;
}

export const SkipButton: React.FC<SkipButtonProps> = ({ onSkip }) => {
  const colors = useThemeColors();

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: colors.text.secondary }]} 
      onPress={onSkip}
      activeOpacity={0.7}
    >
      <Text style={[styles.skipText, { color: colors.text.secondary }]}>
        Skip
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
