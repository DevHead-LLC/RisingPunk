import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type AntivirusShieldTimerProps = {
  completesAt: string;
  onComplete: () => void;
};

export const AntivirusShieldTimer: React.FC<AntivirusShieldTimerProps> = ({
  completesAt,
  onComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const colors = useThemeColors();

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const completionTime = new Date(completesAt).getTime();
      const remaining = Math.max(0, completionTime - now);
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        onComplete();
      }
    };

    // Update immediately
    updateTimer();
    
    // Set up interval for updates
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [completesAt, onComplete]);

  const formattedTime = useMemo(() => {
    const totalSeconds = Math.floor(timeLeft / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
  }, [timeLeft]);

  if (timeLeft <= 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.timerText, { color: colors.secondary }]}>
        {formattedTime} remaining
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: SIZING.spacing.xs,
  },
  timerText: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
  },
});
