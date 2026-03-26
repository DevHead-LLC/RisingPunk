import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type BuildTimerProps = {
  /** 0–100 from wall-clock startedAt → completesAt (same source as the progress bar). */
  progress: number;
  timeRemainingMs: number;
  totalBuildQuantity: number;
};

export const BuildTimer = React.memo(function BuildTimer({
  progress,
  timeRemainingMs,
  totalBuildQuantity,
}: BuildTimerProps) {
  const colors = useThemeColors();

  const botsBuilt = Math.floor((progress / 100) * totalBuildQuantity);

  const formattedTime = useMemo(() => {
    const seconds = Math.floor(timeRemainingMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) {parts.push(`${days}d`);}
    if (hours % 24 > 0) {parts.push(`${hours % 24}h`);}
    if (minutes % 60 > 0) {parts.push(`${minutes % 60}m`);}
    parts.push(`${seconds % 60}s`);

    return `${parts.join(' ')} remaining`;
  }, [timeRemainingMs]);

  return (
    <View style={styles.container}>
      <Text style={[styles.progressText, { color: colors.text.primary }]} numberOfLines={1}>
        {`${botsBuilt}/${totalBuildQuantity}`}
      </Text>
      <Text style={[styles.timerText, { color: colors.text.primary }]} numberOfLines={1}>
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
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    width: 100,
  },
  timerText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
});
