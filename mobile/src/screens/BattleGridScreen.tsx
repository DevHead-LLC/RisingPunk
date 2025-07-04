/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container with network visualization
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Text } from 'react-native';
import { useInitialBattleNodes } from '../hooks/useBattleNodes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  onClose?: () => void;
};

export const BattleGridScreen = React.memo(({ onClose }: Props) => {
  // Use the single source of truth for node state/positions
  const nodes = useInitialBattleNodes({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  return (
    <SafeAreaView style={styles.container} testID="battle-grid-screen">
      <View style={styles.battleArea}>
        {/* Temporary network visualization */}
        <View style={styles.networkContainer}>
          {/* Draw nodes */}
          {nodes.map((node) => {
            const getNodeColor = () => {
              switch (node.owner) {
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
                key={node.index}
                style={[
                  styles.node,
                  {
                    left: node.position.x - 10,
                    top: node.position.y - 10,
                    backgroundColor: getNodeColor(),
                  }
                ]}
              >
                <Text style={styles.nodeLabel}>{node.index}</Text>
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