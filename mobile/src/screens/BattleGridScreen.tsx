/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container - orchestrates battle components
 */

import React, { useState, useCallback } from 'react';
import { View, SafeAreaView, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BattleNetworkGrid } from '../components/battle/BattleNetworkGrid';
import { BattleBattalionManager } from '../components/battle/BattleBattalionManager';
import { BattleOverlayManager } from '../components/battle/BattleOverlayManager';
import { ReviewPromptModal } from '../components/profile/ReviewPromptModal';
import { battleGridStyles, createThemeAwareBattleGridStyles } from '../styles/battleGridStyles';
import { useThemeColors } from '../hooks/useThemeColors';

const REVIEW_PROMPT_SEEN_KEY = '@RisingPunk/hasSeenReviewPrompt';

type Props = {
  _onClose?: () => void;
  battleId: string; // Required battle ID for server integration
};

export const BattleGridScreen = React.memo(({ _onClose, battleId }: Props) => {
  const colors = useThemeColors();
  const themeStyles = createThemeAwareBattleGridStyles(colors);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  // One-time review prompt when user wins a battle (no reward; store policy).
  const handleUserWin = useCallback(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(REVIEW_PROMPT_SEEN_KEY);
        if (seen === 'true') return;
        await AsyncStorage.setItem(REVIEW_PROMPT_SEEN_KEY, 'true');
        setShowReviewPrompt(true);
      } catch {
        // ignore
      }
    })();
  }, []);

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
          onUserWin={handleUserWin}
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
      <ReviewPromptModal
        visible={showReviewPrompt}
        onClose={() => setShowReviewPrompt(false)}
      />
    </SafeAreaView>
  );
});
