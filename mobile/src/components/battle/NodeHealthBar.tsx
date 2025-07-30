import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  node: {
    index: number;
    owner: 'user' | 'enemy' | 'neutral';
    tugOfWarProgress: number;
    maxCaptureThreshold: number;
    position: { x: number; y: number };
  };
}

export const NodeHealthBar: React.FC<Props> = ({ node }) => {
  if (node.owner !== 'neutral') return null;

  const progressPercentage = Math.abs(node.tugOfWarProgress);
  const barColor = node.tugOfWarProgress > 0 ? '#4717F6' : node.tugOfWarProgress < 0 ? '#FF4141' : '#666666';
  const barWidth = Math.min(progressPercentage, 100);
  const isUserControl = node.tugOfWarProgress > 0;

  return (
    <View style={[
      styles.container,
      {
        left: node.position.x - 20,
        top: node.position.y - 35,
      }
    ]}>
      <View style={styles.backgroundBar}>
        <View style={[
          styles.progressBar,
          {
            width: `${barWidth}%`,
            backgroundColor: barColor,
            alignSelf: isUserControl ? 'flex-start' : 'flex-end',
          }
        ]} />
      </View>
      <Text style={styles.progressText}>
        {Math.abs(node.tugOfWarProgress).toFixed(0)}%
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