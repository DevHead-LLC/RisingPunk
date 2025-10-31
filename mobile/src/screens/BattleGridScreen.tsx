/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container - orchestrates battle components
 */

import React from 'react';
import { View, SafeAreaView, Text } from 'react-native';
import { BattleNetworkGrid } from '../components/battle/BattleNetworkGrid';
import { BattleBattalionManager } from '../components/battle/BattleBattalionManager';
import { BattleOverlayManager } from '../components/battle/BattleOverlayManager';
import { battleGridStyles, createThemeAwareBattleGridStyles } from '../styles/battleGridStyles';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = {
  _onClose?: () => void;
  battleId: string; // Required battle ID for server integration
};

export const BattleGridScreen = React.memo(({ _onClose, battleId }: Props) => {
  const colors = useThemeColors();
  const themeStyles = createThemeAwareBattleGridStyles(colors);

  // Handle missing battleId
  if (!battleId) {
    return (
      <SafeAreaView style={themeStyles.container} testID="battle-grid-screen">
        <View style={themeStyles.loadingContainer}>
          <Text style={themeStyles.errorText}>No battle ID provided</Text>
          <Text style={themeStyles.errorSubtext}>Please start a battle first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themeStyles.container} testID="battle-grid-screen">
      <View style={themeStyles.battleArea}>
        {/* Overlays (countdown, timer) - self-contained with its own API call */}
        <BattleOverlayManager
          battleId={battleId}
          onClose={_onClose}
        />

        {/* Network visualization - self-contained with its own API call */}
        <View style={themeStyles.networkContainer}>
          <BattleNetworkGrid
            battleId={battleId}
            nodeSize={20}
            lineWidth={2}
            showNodeLabels={true}
          />

          {/* Battalion visualization - self-contained with its own API call */}
          <BattleBattalionManager
            battleId={battleId}
            battalionSize={35}
            showHealthBars={true}
          />
        </View>
      </View>
    </SafeAreaView>
  );
});
