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
import type { BattleState } from '../../../../shared/battleReplay';

interface Props {
  battleId: string;
  battalionSize?: number;
  showHealthBars?: boolean;
  overrideBattleState?: BattleState | null;
  /** When set (replay), battalion movement progress uses virtual ms (frame `t` + wall delta), not `Date.now()` client anchors. */
  replayMovementVirtualNowMs?: number;
  /** Aligns live-recorded `movementState.startTime` (Unix) with virtual frame `t`. */
  replayMovementEpochMs?: number;
}

export const BattleBattalionManager = React.memo(({
  battleId,
  battalionSize = 40,
  showHealthBars = true,
  overrideBattleState,
  replayMovementVirtualNowMs,
  replayMovementEpochMs,
}: Props) => {
  const [pollingInterval, setPollingInterval] = useState<number>(ANIMATION_CONFIG.DEFAULT_POLLING_MS);
  
  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useBattleState({
    battleId,
    pollingInterval,
    overrideState: overrideBattleState,
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
      battalion.position && battalion.position.x !== undefined && battalion.position.y !== undefined
    );
  }, [battleState?.battalions]);

  const renderBattalions = React.useMemo(() => {
    if (!battleState) return null;

    return (
      <View style={styles.container}>
        {filteredBattalions
          .map((battalion) => {
            const movementState = movementStateMap.get(battalion.id);
            
            return (
              <BattleBattalion
                key={battalion.id}
                battalion={battalion}
                position={battalion.position}
                movementState={movementState}
                size={battalionSize}
                showHealthBar={showHealthBars}
                replayMovementVirtualNowMs={replayMovementVirtualNowMs}
                replayMovementEpochMs={replayMovementEpochMs}
              />
            );
          })}
      </View>
    );
  }, [
    battleState,
    battalionSize,
    showHealthBars,
    filteredBattalions,
    nodePositions,
    movementStateMap,
    replayMovementVirtualNowMs,
    replayMovementEpochMs,
  ]);

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
