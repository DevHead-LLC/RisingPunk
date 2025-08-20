import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';
import { useAppSelector } from '../../store/hooks';

type BuildTimerProps = {
  _quantity: number;
  buildTimePerUnit: number;
  progress: number;
};

export const BuildTimer = React.memo(function BuildTimer({
  _quantity,
  buildTimePerUnit,
  progress,
}: BuildTimerProps) {

  const totalBuildQuantity = useAppSelector((state) => state.bots.totalBuildQuantity);
  const buildStartTime = useAppSelector((state) => state.bots.buildStartTime);
  const [currentProgress, setCurrentProgress] = useState<number>(progress);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const botsBuilt = Math.floor((currentProgress / 100) * totalBuildQuantity);

  useEffect(() => {
    if (!buildStartTime || totalBuildQuantity === 0) return;

    // Validate buildStartTime to prevent calculation errors
    const startTime = new Date(buildStartTime).getTime();
    if (isNaN(startTime) || startTime <= 0) return;

    const updateProgress = () => {
      const now = Date.now();
      const totalTime = totalBuildQuantity * buildTimePerUnit;
      const elapsed = now - startTime;
      
      if (elapsed >= totalTime) {
        setCurrentProgress(100);
        setTimeLeft(0);
      } else {
        const newProgress = (elapsed / totalTime) * 100;
        
        // Safety check: if we're way off from server progress, sync up
        if (Math.abs(newProgress - progress) > 15) {
          setCurrentProgress(progress);
        } else {
          setCurrentProgress(newProgress);
        }
        
        setTimeLeft(totalTime - elapsed);
      }
    };

    updateProgress();
    const timer = setInterval(updateProgress, 1000);

    return () => clearInterval(timer);
  }, [buildStartTime, totalBuildQuantity, buildTimePerUnit, progress]);

  const formattedTime = useMemo(() => {
    const seconds = Math.floor(timeLeft / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) {parts.push(`${days}d`);}
    if (hours % 24 > 0) {parts.push(`${hours % 24}h`);}
    if (minutes % 60 > 0) {parts.push(`${minutes % 60}m`);}
    parts.push(`${seconds % 60}s`);

    return `${parts.join(' ')} remaining`;
  }, [timeLeft]);

  return (
    <View style={styles.container}>
      <Text style={styles.progressText} numberOfLines={1}>
        {`${botsBuilt}/${totalBuildQuantity}`}
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
    width: 100,
  },
  timerText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
});
