import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

interface BuildCountdownTimerProps {
  completesAt: string;
  onComplete: () => void;
}

export const BuildCountdownTimer: React.FC<BuildCountdownTimerProps> = ({ completesAt, onComplete }) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const completionTime = new Date(completesAt).getTime();
      const remaining = Math.max(0, completionTime - now);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        onComplete();
      }
    };

    // Update immediately
    updateTimer();
    
    // Set up interval for updates
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [completesAt, onComplete]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  if (timeRemaining <= 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>Time Remaining: {formatTime(timeRemaining)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZING.spacing.sm,
  },
  timer: {
    color: COLORS.matrix, // Green color as requested
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 140, // Increased width to accommodate longer time formats
    fontFamily: 'monospace', // Monospace font for consistent character width
  },
});
