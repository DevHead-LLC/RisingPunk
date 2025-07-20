/**
 * @file BattleBattalionManager.tsx
 * @description Self-contained battalion visualization component with direct server integration
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { useGetBattleStateQuery } from '../../store/api/battleApi';
import { Battalion } from '../../types/battle';
import { BattleBattalion } from './BattleBattalion';

// BattleNodeState type moved to server API types
type BattleNodeState = {
  index: number;
  owner: 'user' | 'enemy' | 'neutral';
  health?: number;
  captureProgress?: number;
  position: { x: number; y: number };
};

interface Props {
  battleId: string;
  battalionSize?: number;
  showHealthBars?: boolean;
  showQuantities?: boolean;
  showBotTypes?: boolean;
}

export const BattleBattalionManager = React.memo(({
  battleId,
  battalionSize = 40,
  showHealthBars = true,
  showQuantities = true,
  showBotTypes = true,
}: Props) => {
  // Get screen dimensions for server calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Direct API call to get battle state
  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useGetBattleStateQuery(
    { battleId, screenWidth, screenHeight },
    {
      pollingInterval: 1000, // Poll every 1 second for real-time updates
      skip: !battleId,
    }
  );

  // SIMPLE LOG: Only log problems
  useEffect(() => {
    if (battleError) {
      console.log('❌ BATTALION API ERROR:', battleError);
    }
  }, [battleError]);

  // Show loading state while fetching server data
  if (battleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4717F6" />
        <Text style={styles.loadingText}>Loading battalions...</Text>
      </View>
    );
  }

  // Show error state if server data fails
  if (battleError || !battleState) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load battalions</Text>
        <Text style={styles.errorSubtext}>Please try again</Text>
      </View>
    );
  }

  const battalions = battleState.battalions || [];
  const nodes = battleState.nodes || [];

  // Create a map of node positions for quick lookup
  const nodePositions = nodes.reduce((acc, node) => {
    acc[node.index] = node.position;
    return acc;
  }, {} as Record<number, { x: number; y: number }>);

  // Filter out battalions that don't have valid node positions
  const validBattalions = battalions.filter(battalion => {
    return nodePositions[battalion.nodeIndex] !== undefined;
  });

  return (
    <View style={styles.container}>
      {validBattalions.map((battalion) => {
        const nodePosition = nodePositions[battalion.nodeIndex];
        if (!nodePosition) {return null;}

        return (
          <BattleBattalion
            key={battalion.id}
            battalion={battalion}
            position={nodePosition}
            size={battalionSize}
            showHealthBar={showHealthBars}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // Allow touches to pass through to underlying components
  },
  loadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  loadingText: {
    marginTop: 10,
    color: '#4717F6',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.1)',
  },
  errorText: {
    color: '#FF4141',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
});
