/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container with network visualization
 */

import React from 'react';
import { View, StyleSheet, SafeAreaView, Dimensions, Text } from 'react-native';
import { useInitialBattleNodes } from '../hooks/useBattleNodes';
import { useBattleNetworkConnections } from '../hooks/useBattleNetwork';
import { useBattalionData } from '../hooks/useBattalionData';
import { useBots } from '../hooks/useBots';
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

  // Battalion data management system
  const battalionData = useBattalionData();

  // Bot categories and stats
  const { BOT_CATEGORIES, getBotRole } = useBots();

  // Example: Create a sample battalion to demonstrate the system
  const sampleBattalion = React.useMemo(() => {
    return battalionData.createBattalion('guardian', 10, 0, true, 1);
  }, [battalionData]);

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

        {/* Bot Categories Integration Demo */}
        <View style={styles.botInfoContainer}>
          <Text style={styles.botInfoTitle}>Bot Categories Available:</Text>
          {Object.entries(BOT_CATEGORIES).map(([type, category]) => (
            <Text key={type} style={styles.botInfoText}>
              {getBotRole(type as any)}: {category.advantage}
            </Text>
          ))}
        </View>

        {/* Sample Battalion Demo */}
        <View style={styles.battalionInfoContainer}>
          <Text style={styles.battalionInfoTitle}>Sample Battalion:</Text>
          <Text style={styles.battalionInfoText}>
            Type: {getBotRole(sampleBattalion.type)} |
            Quantity: {sampleBattalion.quantity} |
            Health: {sampleBattalion.currentHealth}/{sampleBattalion.maxHealth}
          </Text>
        </View>
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
    marginBottom: 20,
  },
  botInfoContainer: {
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4717F6',
  },
  botInfoTitle: {
    color: '#4717F6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  botInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginBottom: 4,
  },
  battalionInfoContainer: {
    backgroundColor: 'rgba(255, 65, 65, 0.1)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4141',
  },
  battalionInfoTitle: {
    color: '#FF4141',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  battalionInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});
