/**
 * @file NodeHealthBar.tsx
 * @description Tug-of-war progress bar for neutral nodes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  node: {
    index: number;
    owner: 'user' | 'enemy' | 'neutral';
    tugOfWarProgress: number;      // -100 to +100
    maxCaptureThreshold: number;   // Total army health
    position: { x: number; y: number };
  };
}

export const NodeHealthBar: React.FC<Props> = ({ node }) => {
  // USER REQUIREMENT: Only show for neutral nodes
  if (node.owner !== 'neutral') {
    return null;
  }

  const tugProgress = node.tugOfWarProgress; // -100 to +100
  const progressPercentage = Math.abs(tugProgress);
  
  // USER REQUIREMENT: Blue (+) = user control, Red (-) = enemy control
  const barColor = tugProgress > 0 ? '#4717F6' : tugProgress < 0 ? '#FF4141' : '#666666';
  
  // Calculate bar width based on progress percentage
  const barWidth = Math.min(progressPercentage, 100);
  
  // Determine which side the bar should fill from
  const isUserControl = tugProgress > 0;
  const barStyle = {
    width: `${barWidth}%` as any,
    backgroundColor: barColor,
    alignSelf: isUserControl ? 'flex-start' as const : 'flex-end' as const,
  };

  return (
    <View style={[
      styles.container,
      {
        left: node.position.x - 20, // Center the bar above the node
        top: node.position.y - 35,  // Position above the node
      }
    ]}>
      {/* Background bar */}
      <View style={styles.backgroundBar}>
        {/* Progress bar */}
        <View style={[styles.progressBar, barStyle]} />
      </View>
      
      {/* Progress text */}
      <Text style={styles.progressText}>
        {Math.abs(tugProgress).toFixed(0)}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 40,
    alignItems: 'center',
  },
  backgroundBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 8,
    color: '#FFFFFF',
    marginTop: 2,
    fontWeight: 'bold',
  },
}); 