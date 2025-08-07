/**
 * @file BattleOverlayManager.tsx
 * @description Self-contained battle overlay manager with direct server integration
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useBattleState } from '../../hooks/useBattleState';
import { BattleTimerDisplay } from './BattleTimerDisplay';
import { BattleCountdownOverlay } from './BattleCountdownOverlay';
import { BattleLoadingError } from './BattleLoadingError';
import { BattleEndOverlay } from './BattleEndOverlay';
import { BattlePhase } from '../../types/battleTypes';
import { NodeOwner } from '../../types/battleTypes';
import { BATTLE_CONFIG } from '../../config/battleConstants';

// Server phase types (from server/src/types/battle.ts)
type ServerPhase = 'setup' | 'countdown' | 'active' | 'battle' | 'victory' | 'defeat' | 'complete';

// Map server phases to client phases
const mapServerPhaseToClientPhase = (serverPhase: ServerPhase | undefined): BattlePhase => {
  switch (serverPhase) {
    case 'setup':
    case 'countdown':
      return BattlePhase.COUNTDOWN;
    case 'active':
    case 'battle':
      return BattlePhase.ACTIVE;
    case 'victory':
    case 'defeat':
    case 'complete':
      return BattlePhase.COMPLETE;
    default:
      return BattlePhase.COUNTDOWN;
  }
};

interface BattleOverlayManagerProps {
  battleId: string;
  onClose?: () => void;
}

export const BattleOverlayManager: React.FC<BattleOverlayManagerProps> = ({
  battleId,
  onClose,
}) => {
  // Track logged errors to prevent spam
  const loggedErrors = useRef<Set<string>>(new Set());

  const {
    data: battleState,
    isLoading: battleLoading,
    error: battleError,
  } = useBattleState({
    battleId,
    pollingInterval: 1000,
  });

  // SIMPLE LOG: Only log problems (once per error)
  useEffect(() => {
    if (battleError) {
      // Create a unique key for this error to prevent duplicate logging
      const errorKey = JSON.stringify(battleError);
      if (!loggedErrors.current.has(errorKey)) {
        loggedErrors.current.add(errorKey);
      }
    }
  }, [battleError]);

  const phaseData = React.useMemo(() => {
    if (!battleState) return null;

    const phase = battleState.phase;
    const timeRemaining = battleState.timeRemaining || BATTLE_CONFIG.BATTLE_DURATION;
    const maxBattleTime = BATTLE_CONFIG.BATTLE_DURATION;

    // Map server phase to client phase
    const clientPhase = mapServerPhaseToClientPhase(phase);

    // For the timer display, we want to show time remaining (45s down to 0s)
    // The server sends timeRemaining, so we use that directly for display
    const battleTime = timeRemaining; // Use timeRemaining directly instead of calculating

    // Determine if we're in countdown phase and show countdown overlay
    // Server sends timeRemaining: 3,2,1 during countdown phase
    const isCountdownPhase = clientPhase === BattlePhase.COUNTDOWN && timeRemaining <= BATTLE_CONFIG.COUNTDOWN_DURATION && timeRemaining > 0;
    const countdownValue = isCountdownPhase ? timeRemaining : 0;

    // Debug logging for battle end
    if (clientPhase === BattlePhase.COMPLETE) {
      console.log('🔍 BATTLE END DETECTED:', {
        phase: phase,
        clientPhase: clientPhase,
        winner: battleState.winner,
        onClose: !!onClose,
        timeRemaining: timeRemaining
      });
    }

    return {
      clientPhase,
      battleTime,
      maxBattleTime,
      isCountdownPhase,
      countdownValue,
      isTimerVisible: clientPhase === BattlePhase.COUNTDOWN || clientPhase === BattlePhase.ACTIVE
    };
  }, [battleState, onClose]);

  const renderOverlays = React.useMemo(() => {
    if (!phaseData) return null;

    // Check if battle end overlay should be shown
    const shouldShowBattleEnd = phaseData.clientPhase === BattlePhase.COMPLETE && 
                               battleState?.winner && 
                               onClose && 
                               (battleState.winner === 'user' || battleState.winner === 'enemy');

    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Battle timer - always rendered and visible during countdown and active phases */}
        <BattleTimerDisplay
          battleTime={phaseData.battleTime}
          maxBattleTime={phaseData.maxBattleTime}
          isVisible={phaseData.isTimerVisible}
        />

        {/* Countdown overlay - rendered on top when in COUNTDOWN phase */}
        {phaseData.isCountdownPhase && phaseData.countdownValue > 0 && (
          <BattleCountdownOverlay countdown={phaseData.countdownValue} isVisible={true} />
        )}

        {/* Battle end overlay - rendered when battle is complete */}
        {shouldShowBattleEnd && (
          <BattleEndOverlay 
            winner={battleState.winner === 'user' ? NodeOwner.USER : NodeOwner.ENEMY}
            onContinue={onClose}
            battleEndData={battleState.battleEndData}
          />
        )}
      </View>
    );
  }, [phaseData, battleState, onClose]);

  return (
    <BattleLoadingError
      isLoading={battleLoading}
      error={battleError}
      loadingText="Loading overlays..."
      errorText="Failed to load overlays"
      errorSubtext="Please try again"
    >
      {renderOverlays}
    </BattleLoadingError>
  );
};

const styles = StyleSheet.create({
  // Styles moved to BattleLoadingError component
});
