/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container with network visualization
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Text } from 'react-native';
import { useInitialBattleNodes } from '../hooks/useBattleNodes';
import { useBattleNetworkConnections } from '../hooks/useBattleNetwork';
import { BattleNetworkGrid } from '../components/battle/BattleNetworkGrid';
import { BattleOverlayManager } from '../components/battle/BattleOverlayManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  onClose?: () => void;
};

export const BattleGridScreen = React.memo(({ onClose }: Props) => {
  // Use the single source of truth for node state/positions
  const nodes = useInitialBattleNodes({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  
  // Use the single source of truth for network connections
  const connections = useBattleNetworkConnections();

  return (
    <SafeAreaView style={styles.container} testID="battle-grid-screen">
      <View style={styles.battleArea}>
        {/* Overlays (countdown, timer) */}
        <BattleOverlayManager />
        {/* Network visualization */}
        <View style={styles.networkContainer}>
          <BattleNetworkGrid
            nodes={nodes.map(node => ({
              ...node,
              // Ensure index is NodeIndex and owner is NodeOwner
              index: node.index as any, // TypeScript: treat as NodeIndex
              owner: (node.owner === 'user' || node.owner === 'enemy' || node.owner === 'neutral') ? node.owner : 'neutral',
            })) as any}
            connections={connections}
            nodeSize={20}
            lineColor="#666666"
            lineWidth={2}
            showNodeLabels={true}
          />
        </View>
        
        {/* Title */}
        <Text style={styles.title}>Battle Grid Screen</Text>
        <Text style={styles.subtitle}>Network visualization complete</Text>
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