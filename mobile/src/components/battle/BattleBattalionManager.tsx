/**
 * @file BattleBattalionManager.tsx
 * @description Self-contained battalion visualization component with direct server integration
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BattleBattalion } from './BattleBattalion';
import { createNodePositionMap } from '../../utils/battleUtils';
import { ANIMATION_CONFIG } from '../../config';
import { BattleLoadingError } from './BattleLoadingError';
import { useBattleState } from '../../hooks/useBattleState';

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
  const [pollingInterval, setPollingInterval] = useState<number>(ANIMATION_CONFIG.DEFAULT_POLLING_MS);
  
  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useBattleState({
    battleId,
    pollingInterval,
  });

  const calculatedPollingInterval = React.useMemo(() => 
    battleState?.phase === 'battle' 
      ? ANIMATION_CONFIG.BATTLE_PHASE_POLLING_MS 
      : ANIMATION_CONFIG.DEFAULT_POLLING_MS
  , [battleState?.phase]);

  useEffect(() => {
    setPollingInterval(calculatedPollingInterval);
  }, [calculatedPollingInterval]);

  const nodePositions = React.useMemo(() => {
    if (!battleState?.nodes) return {};
    return createNodePositionMap(battleState.nodes);
  }, [battleState?.nodes]);

  const movementStateMap = React.useMemo(() => {
    if (!battleState?.movementStates) return new Map();
    return new Map(battleState.movementStates.map(ms => [ms.battalionId, ms]));
  }, [battleState?.movementStates]);

  const filteredBattalions = React.useMemo(() => {
    if (!battleState?.battalions) return [];
    return battleState.battalions.filter(battalion => 
      nodePositions[battalion.nodeIndex] !== undefined
    );
  }, [battleState?.battalions, nodePositions]);

  const renderBattalions = React.useMemo(() => {
    if (!battleState) return null;

    return (
      <View style={styles.container}>
        {filteredBattalions
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
  }, [battleState, battalionSize, showHealthBars, filteredBattalions, nodePositions, movementStateMap]);

  return (
    <BattleLoadingError
      isLoading={battleLoading}
      error={battleError}
      loadingText="Loading battalions..."
      errorText="Failed to load battalions"
      errorSubtext="Please try again"
    >
      {renderBattalions}
    </BattleLoadingError>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
});
