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
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const [pollingInterval, setPollingInterval] = useState<number>(ANIMATION_CONFIG.DEFAULT_POLLING_MS);
  
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

  useEffect(() => {
    setPollingInterval(
      battleState?.phase === 'battle' 
        ? ANIMATION_CONFIG.BATTLE_PHASE_POLLING_MS 
        : ANIMATION_CONFIG.DEFAULT_POLLING_MS
    );
  }, [battleState?.phase]);

  if (battleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4717F6" />
        <Text style={styles.loadingText}>Loading battalions...</Text>
      </View>
    );
  }

  if (battleError || !battleState) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load battalions</Text>
        <Text style={styles.errorSubtext}>Please try again</Text>
      </View>
    );
  }

  const { battalions = [], nodes = [], movementStates = [] } = battleState;
  const nodePositions = createNodePositionMap(nodes);
  const movementStateMap = new Map(movementStates.map(ms => [ms.battalionId, ms]));

  return (
    <View style={styles.container}>
      {battalions
        .filter(battalion => nodePositions[battalion.nodeIndex] !== undefined)
        .map((battalion) => {
          const nodePosition = nodePositions[battalion.nodeIndex];
          const movementState = movementStateMap.get(battalion.id);
          
          if (!nodePosition) return null;

          return (
            <BattleBattalion
              key={battalion.id}
              battalion={battalion}
              position={nodePosition}
              movementState={movementState}
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
    pointerEvents: 'none',
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
