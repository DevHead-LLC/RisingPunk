import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { BuildCountdownTimer } from './BuildCountdownTimer';

interface DevelopmentTimerProps {
  isBuilding: boolean;
  buildStatus: any;
  onComplete: () => void;
  topOffset?: string;
  leftOffset?: number;
  width?: number;
}

export const DevelopmentTimer: React.FC<DevelopmentTimerProps> = ({
  isBuilding,
  buildStatus,
  onComplete,
  topOffset = '115%',
  leftOffset = -70,
  width = 140
}) => {
  if (!isBuilding || !buildStatus) {
    return null;
  }

  const timerStyle = [
    styles.timerContainer,
    {
      top: topOffset,
      left: '50%',
      transform: [{ translateX: leftOffset }],
      width
    }
  ];

  return (
    <View style={timerStyle}>
      <BuildCountdownTimer
        completesAt={buildStatus.completesAt}
        onComplete={onComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZING.spacing.md,
  },
});
