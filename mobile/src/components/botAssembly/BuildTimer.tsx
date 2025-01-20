import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type BuildTimerProps = {
  quantity: number;
  buildTimePerUnit: number;
  progress: number;
};

export const BuildTimer = React.memo(function BuildTimer({
  quantity,
  buildTimePerUnit,
  progress
}: BuildTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const totalTime = quantity * buildTimePerUnit;
    const remainingTime = totalTime * (1 - progress / 100);
    setTimeLeft(Math.ceil(remainingTime));

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [quantity, buildTimePerUnit, progress]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    parts.push(`${seconds % 60}s`);

    return `${parts.join(' ')} remaining`;
  };

  return (
    <Text style={styles.timerText}>
      {formatTime(timeLeft)}
    </Text>
  );
});

const styles = StyleSheet.create({
  timerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    textAlign: 'right',
    marginBottom: SIZING.spacing.xs,
  },
}); 