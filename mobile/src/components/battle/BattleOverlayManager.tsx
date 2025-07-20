/**
 * @file BattleOverlayManager.tsx
 * @description Self-contained battle overlay manager with direct server integration
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { useGetBattleStateQuery } from '../../store/api/battleApi';
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
  battleId: string;
}

export const BattleOverlayManager: React.FC<BattleOverlayManagerProps> = ({
  battleId,
}) => {
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
      console.log('❌ OVERLAY API ERROR:', battleError);
    }
  }, [battleError]);

  // Show loading state while fetching server data
  if (battleLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4717F6" />
        <Text style={styles.loadingText}>Loading overlays...</Text>
      </View>
    );
  }

  // Show error state if server data fails
  if (battleError || !battleState) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load overlays</Text>
        <Text style={styles.errorSubtext}>Please try again</Text>
      </View>
    );
  }

  // Extract timer data from server response
  const phase = battleState.phase;
  const timeRemaining = battleState.timeRemaining || 20;
  const maxBattleTime = 20; // Fixed battle duration

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

const styles = StyleSheet.create({
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
