/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container with direct server data integration
 */

import React, { useEffect, useMemo } from 'react';
import { View, SafeAreaView, Text, ActivityIndicator, Dimensions } from 'react-native';
import { useGetBattleStateQuery } from '../store/api/battleApi';
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
  // Handle missing battleId
  if (!battleId) {
    return (
      <SafeAreaView style={battleGridStyles.container} testID="battle-grid-screen">
        <View style={battleGridStyles.loadingContainer}>
          <Text style={battleGridStyles.errorText}>No battle ID provided</Text>
          <Text style={battleGridStyles.errorSubtext}>Please start a battle first</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state and initialization management through useBattleState
  const { 
    errorState, 
    setLoading, 
    setError, 
    clearError,
    initializeComponent
  } = useBattleState(battleId);

  // Get screen dimensions for server calculations
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Direct API call to get battle state (no middleware)
  const { 
    data: battleState, 
    isLoading: battleLoading, 
    error: battleError 
  } = useGetBattleStateQuery(
    { battleId: battleId!, screenWidth, screenHeight }, 
    {
      pollingInterval: 1000, // Poll every 1 second for real-time updates
      skip: !battleId,
    }
  );
  


  // SIMPLE LOG: Only log if there are problems
  React.useEffect(() => {
    if (battleState && battleState.nodes?.length > 0) {
      const firstNode = battleState.nodes[0];
      if (!firstNode.index && firstNode.index !== 0) {
        console.log('❌ NODES MISSING INDEX/OWNER - Server sending Mongoose docs');
      }
    }
    if (battleError) {
      console.log('❌ API ERROR:', battleError);
    }
  }, [battleState, battleError]);

  // Server provides correct node positions for current screen - no client calculation needed

  // Component initialization and error state sync
  useEffect(() => {
    // Initialize component
    initializeComponent(battleId);
    
    // Sync error state from API to useBattleState
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
  if (battleError || errorState.hasError || !battleState) {
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
          phase={battleState.phase}
          timeRemaining={battleState.timeRemaining}
          maxBattleTime={20}
        />

        {/* Network visualization using server positions */}
        <View style={battleGridStyles.networkContainer}>
          <BattleNetworkGrid
            nodes={battleState.nodes || []}
            connections={battleState.networkConnections || []}
            lineProperties={battleState.lineProperties || []}
            nodeSize={20}
            lineColor="#666666"
            lineWidth={2}
            showNodeLabels={true}
          />

          {/* Battalion visualization using server positions */}
          <BattleBattalionManager
            battalions={battleState.battalions || []}
            nodes={battleState.nodes || []}
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
