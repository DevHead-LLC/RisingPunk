import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type BuildProgressBarProps = {
  progress: number;
};

export const BuildProgressBar = React.memo(function BuildProgressBar({
  progress,
}: BuildProgressBarProps) {
  const colors = useThemeColors();

  return (
    <View style={[styles.progressBar, { backgroundColor: colors.text.placeholder + '30' }]}>
      <View
        style={[
          styles.progressFill,
          { 
            width: `${progress}%`,
            backgroundColor: colors.matrix + '60',
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: SIZING.spacing.xs,
  },
  progressFill: {
    height: '100%',
  },
});
