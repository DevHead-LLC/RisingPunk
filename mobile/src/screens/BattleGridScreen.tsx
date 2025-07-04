/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container with network visualization
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Text } from 'react-native';
import { NodeIndex } from '../types/battleTypes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const H_PADDING = 64; // horizontal padding for safe area
const V_PADDING = 40; // reduced vertical padding for more height usage

// Dynamically calculate node positions for 3 columns and 3 rows
function getDynamicNodePositions() {
  const colWidth = (SCREEN_WIDTH - 2 * H_PADDING) / 2; // 3 columns: left, center, right
  const rowHeight = (SCREEN_HEIGHT - 2 * V_PADDING) / 2; // 3 rows: top, middle, bottom

  const X_LEFT = H_PADDING;
  const X_CENTER = H_PADDING + colWidth;
  const X_RIGHT = H_PADDING + 2 * colWidth;
  const Y_TOP = V_PADDING;
  const Y_MIDDLE = V_PADDING + rowHeight;
  const Y_BOTTOM = V_PADDING + 2 * rowHeight;

  return {
    0: { x: X_LEFT, y: Y_TOP },
    1: { x: X_LEFT, y: Y_MIDDLE },
    2: { x: X_LEFT, y: Y_BOTTOM },
    3: { x: X_CENTER, y: Y_TOP },
    4: { x: X_CENTER, y: Y_MIDDLE },
    5: { x: X_CENTER, y: Y_BOTTOM },
    6: { x: X_RIGHT, y: Y_TOP },
    7: { x: X_RIGHT, y: Y_MIDDLE },
    8: { x: X_RIGHT, y: Y_BOTTOM },
  } as Record<NodeIndex, { x: number; y: number }>;
}

type Props = {
  onClose?: () => void;
};

export const BattleGridScreen = React.memo(({ onClose }: Props) => {
  // Initial node ownership setup
  const initialNodeOwners: Record<NodeIndex, 'neutral' | 'user' | 'enemy'> = {
    0: 'user',    // Top left - user
    1: 'user',    // Middle left - user
    2: 'user',    // Bottom left - user
    3: 'neutral', // Top center - neutral
    4: 'neutral', // Middle center - neutral
    5: 'neutral', // Bottom center - neutral
    6: 'enemy',   // Top right - enemy
    7: 'enemy',   // Middle right - enemy
    8: 'enemy',   // Bottom right - enemy
  };

  const nodePositions = getDynamicNodePositions();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.battleArea}>
        {/* Temporary network visualization */}
        <View style={styles.networkContainer}>
          {/* Draw nodes */}
          {Object.entries(nodePositions).map(([index, position]) => {
            const nodeIndex = parseInt(index) as NodeIndex;
            const owner = initialNodeOwners[nodeIndex];
            
            const getNodeColor = () => {
              switch (owner) {
                case 'user':
                  return '#4717F6'; // User blue
                case 'enemy':
                  return '#FF4141'; // Enemy red
                default:
                  return '#666666'; // Neutral gray
              }
            };

            return (
              <View
                key={nodeIndex}
                style={[
                  styles.node,
                  {
                    left: position.x - 10,
                    top: position.y - 10,
                    backgroundColor: getNodeColor(),
                  }
                ]}
              >
                <Text style={styles.nodeLabel}>{nodeIndex}</Text>
              </View>
            );
          })}
        </View>
        
        {/* Temporary title */}
        <Text style={styles.title}>Battle Grid Screen</Text>
        <Text style={styles.subtitle}>Network visualization coming in Batch 1B</Text>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background
  },
  battleArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  node: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nodeLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.7,
  },
}); 