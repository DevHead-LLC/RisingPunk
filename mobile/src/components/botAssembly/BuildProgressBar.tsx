import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type BuildProgressBarProps = {
  progress: number;
};

export const BuildProgressBar = React.memo(function BuildProgressBar({ 
  progress 
}: BuildProgressBarProps) {
  return (
    <View style={styles.progressBar}>
      <View 
        testID="progress-fill"
        style={[
          styles.progressFill, 
          { width: `${progress}%` }
        ]} 
      />
    </View>
  );
});

const styles = StyleSheet.create({
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: SIZING.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(0, 255, 65, 0.6)',
  },
}); 