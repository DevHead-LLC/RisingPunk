import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  const botsBuilt = Math.floor((progress / 100) * quantity);

  useEffect(() => {
    const totalTime = quantity * buildTimePerUnit;
    const remainingTime = totalTime * (1 - progress / 100);
    setTimeLeft(Math.ceil(remainingTime));

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [quantity, buildTimePerUnit, progress]);

  const formattedTime = useMemo(() => {
    const seconds = Math.floor(timeLeft / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    parts.push(`${seconds % 60}s`);

    return `${parts.join(' ')} remaining`;
  }, [timeLeft]);

  return (
    <View style={styles.container}>
      <Text style={styles.progressText} numberOfLines={1}>
        {`${botsBuilt}/${quantity}`}
      </Text>
      <Text style={styles.timerText} numberOfLines={1}>
        {formattedTime}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  progressText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    width: 60,
  },
  timerText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
}); 