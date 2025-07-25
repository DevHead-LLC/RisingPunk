/**
 * @file BattleBattalionManager.tsx
 * @description Self-contained battalion visualization component with direct server integration
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { useGetBattleStateQuery } from '../../store/api/battleApi';
import { BattleBattalion } from './BattleBattalion';
import { createNodePositionMap } from '../../utils/battleUtils';
import { ANIMATION_CONFIG } from '../../config';

interface Props {
  battleId: string;
  battalionSize?: number;
  showHealthBars?: boolean;
}

export const BattleBattalionManager = React.memo(({
  battleId,
  battalionSize = 40,
  showHealthBars = true,
}: Props) => {
  // Get screen dimensions for server calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Dynamic polling: Fast during battle phase for immediate movement, slower otherwise
  const [pollingInterval, setPollingInterval] = useState<number>(ANIMATION_CONFIG.DEFAULT_POLLING_MS);
  
  // Direct API call to get battle state
  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useGetBattleStateQuery(
    { battleId, screenWidth, screenHeight },
    {
      pollingInterval,
      skip: !battleId,
    }
  );

  // Adjust polling speed based on battle phase
  useEffect(() => {
    if (battleState?.phase === 'battle') {
      setPollingInterval(ANIMATION_CONFIG.BATTLE_PHASE_POLLING_MS); // Fast polling during active battle for immediate movement
    } else {
      setPollingInterval(ANIMATION_CONFIG.DEFAULT_POLLING_MS); // Slower polling during countdown/victory/etc
    }
  }, [battleState?.phase]);

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
  const movementStates = battleState.movementStates || [];

  // Create a map of node positions for quick lookup
  const nodePositions = createNodePositionMap(nodes);

  // Create a map of movement states for quick lookup
  const movementStateMap = new Map();
  movementStates.forEach(movementState => {
    movementStateMap.set(movementState.battalionId, movementState);
  });

  // Debug: Log movement states received (reduced logging)
  // if (movementStates.length > 0) {
  //   console.log(`📡 CLIENT DEBUG: Received ${movementStates.length} movement states from server`);
  //   movementStates.forEach(ms => {
  //     console.log(`📡 CLIENT DEBUG: Movement state for ${ms.battalionId}: ${ms.movementStatus} from (${ms.startPosition.x},${ms.startPosition.y}) to (${ms.targetPosition.x},${ms.targetPosition.y})`);
  //   });
  // }

  // Filter out battalions that don't have valid node positions
  const validBattalions = battalions.filter(battalion => {
    return nodePositions[battalion.nodeIndex] !== undefined;
  });

  return (
    <View style={styles.container}>
      {validBattalions.map((battalion) => {
        const nodePosition = nodePositions[battalion.nodeIndex];
        const movementState = movementStateMap.get(battalion.id); // Get movement data from global movement states
        if (!nodePosition) {return null;}

        return (
          <BattleBattalion
            key={battalion.id}
            battalion={battalion}
            position={nodePosition}
            movementState={movementState} // Pass movement data to BattleBattalion
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
