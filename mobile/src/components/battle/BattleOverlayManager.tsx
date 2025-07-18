/**
 * @file BattleOverlayManager.tsx
 * @description Manages and displays battle overlays (countdown, timer) for the battle screen. Clean, non-legacy, single source of truth.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BattlePhase } from '../../types/battleTypes';

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

import { BattleCountdownOverlay } from './BattleCountdownOverlay';
import { BattleTimerDisplay } from './BattleTimerDisplay';

interface BattleOverlayManagerProps {
  battleId?: string;
  // Server timer data
  phase?: ServerPhase;
  timeRemaining?: number;
  maxBattleTime?: number;
}

export const BattleOverlayManager: React.FC<BattleOverlayManagerProps> = ({ 
  battleId,
  phase = 'countdown',
  timeRemaining = 20,
  maxBattleTime = 20
}) => {
  // Map server phase to client phase
  const clientPhase = mapServerPhaseToClientPhase(phase);
  
  // Calculate battle time from time remaining for the timer display
  const battleTime = maxBattleTime - timeRemaining;
  
  // Determine if we're in countdown phase and show countdown overlay
  // Server sends timeRemaining: 3,2,1 during countdown phase
  const isCountdownPhase = clientPhase === BattlePhase.COUNTDOWN && timeRemaining <= 3 && timeRemaining > 0;
  const countdownValue = isCountdownPhase ? timeRemaining : 0;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Battle timer - always rendered and visible during countdown and active phases */}
      <BattleTimerDisplay
        battleTime={battleTime}
        maxBattleTime={maxBattleTime}
        isVisible={clientPhase === BattlePhase.COUNTDOWN || clientPhase === BattlePhase.ACTIVE}
      />
      
      {/* Countdown overlay - rendered on top when in COUNTDOWN phase */}
      {isCountdownPhase && countdownValue > 0 && (
        <BattleCountdownOverlay countdown={countdownValue} isVisible={true} />
      )}
      
      {/* No overlay for COMPLETE phase */}
    </View>
  );
};
