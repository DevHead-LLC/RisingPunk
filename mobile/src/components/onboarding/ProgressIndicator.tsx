import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ProgressIndicatorProps {
  currentSlide: number;
  totalSlides: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  currentSlide, 
  totalSlides 
}) => {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={[styles.progressText, { color: colors.text.primary }]}>
        {currentSlide} of {totalSlides}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
