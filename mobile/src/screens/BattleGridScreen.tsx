/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container with network visualization and battalion rendering
 */

import React, { useEffect } from 'react';
import { View, SafeAreaView, Text, ActivityIndicator } from 'react-native';
import { getNetworkConnections } from '../hooks/useBattleLines';
import { useBattleSync } from '../hooks/useBattleSync';
import { useBattleState } from '../hooks/useBattleState';
import { BattleNetworkGrid } from '../components/battle/BattleNetworkGrid';
import { BattleBattalionManager } from '../components/battle/BattleBattalionManager';
import { BattleOverlayManager } from '../components/battle/BattleOverlayManager';
import { battleGridStyles } from '../styles/battleGridStyles';

type Props = {
  _onClose?: () => void;
  battleId: string; // Required battle ID for server integration
};

export const BattleGridScreen = React.memo(({ _onClose, battleId }: Props) => {
  // Use network connections from useBattleLines
  const connections = getNetworkConnections();

  // Error state and initialization management through useBattleState
  const { 
    errorState, 
    setLoading, 
    setError, 
    clearError,
    initializeComponent
  } = useBattleState(battleId);

  // Data orchestration through useBattleSync
  const { 
    displayBattalions, 
    displayNodes, 
    battleState,
    isLoading: battleLoading, 
    error: battleError 
  } = useBattleSync(battleId);

  // Component initialization and error state sync
  useEffect(() => {
    // Initialize component
    initializeComponent(battleId);
    
    // Sync error state from useBattleSync to useBattleState
    setLoading(battleLoading);
    if (battleError) {
      setError('Failed to load battle state');
    } else {
      clearError();
    }
  }, [battleId, battleLoading, battleError, setLoading, setError, clearError, initializeComponent]);

  // Show loading state while fetching server data
  if (battleLoading || errorState.isLoading) {
    return (
      <SafeAreaView style={battleGridStyles.container} testID="battle-grid-screen">
        <View style={battleGridStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#4717F6" />
          <Text style={battleGridStyles.loadingText}>Loading battle state...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if server data fails
  if (battleError || errorState.hasError) {
    return (
      <SafeAreaView style={battleGridStyles.container} testID="battle-grid-screen">
        <View style={battleGridStyles.loadingContainer}>
          <Text style={battleGridStyles.errorText}>Failed to load battle state</Text>
          <Text style={battleGridStyles.errorSubtext}>Please try again</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={battleGridStyles.container} testID="battle-grid-screen">
      <View style={battleGridStyles.battleArea}>
        {/* Overlays (countdown, timer) */}
        <BattleOverlayManager 
          battleId={battleId}
          phase={battleState?.phase}
          timeRemaining={battleState?.timeRemaining}
          maxBattleTime={20}
        />

        {/* Network visualization */}
        <View style={battleGridStyles.networkContainer}>
          <BattleNetworkGrid
            nodes={displayNodes.filter(Boolean) as any}
            connections={connections}
            nodeSize={20}
            lineColor="#666666"
            lineWidth={2}
            showNodeLabels={true}
          />

          {/* Battalion visualization */}
          <BattleBattalionManager
            battalions={displayBattalions}
            nodes={displayNodes as any}
            battalionSize={35}
            showHealthBars={true}
            showQuantities={true}
            showBotTypes={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
});
