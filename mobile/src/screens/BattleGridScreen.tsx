/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container - orchestrates battle components
 */

import React, { useState, useCallback } from 'react';
import { View, SafeAreaView, Text } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { BattleNetworkGrid } from '../components/battle/BattleNetworkGrid';
import { BattleBattalionManager } from '../components/battle/BattleBattalionManager';
import { BattleOverlayManager } from '../components/battle/BattleOverlayManager';
import { ReviewPromptModal } from '../components/profile/ReviewPromptModal';
import { getHasOpenedReview, getHasSeenReviewPrompt, setReviewPromptSeen } from '../utils/openReviewAndClaimReward';
import { battleGridStyles, createThemeAwareBattleGridStyles } from '../styles/battleGridStyles';
import { useThemeColors } from '../hooks/useThemeColors';

type Props = {
  _onClose?: () => void;
  battleId: string; // Required battle ID for server integration
};

export const BattleGridScreen = React.memo(({ _onClose, battleId }: Props) => {
  const colors = useThemeColors();
  const themeStyles = createThemeAwareBattleGridStyles(colors);
  const userId = useAppSelector((state) => state.auth.user?._id);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  // One-time review prompt when user wins a battle (no reward; store policy). Keys are per-user (Bugbot).
  // Mark "seen" on modal dismiss, not before display, so unmount-before-show doesn't permanently suppress prompt (Bugbot).
  const handleUserWin = useCallback(() => {
    (async () => {
      try {
        if (!userId) return;
        const alreadyOpened = await getHasOpenedReview(userId);
        if (alreadyOpened) return;
        const seen = await getHasSeenReviewPrompt(userId);
        if (seen) return;
        setShowReviewPrompt(true);
      } catch {
        // ignore
      }
    })();
  }, [userId]);

  const handleReviewPromptClose = useCallback(() => {
    if (userId) setReviewPromptSeen(userId);
    setShowReviewPrompt(false);
  }, [userId]);

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
        onClose={handleReviewPromptClose}
        userId={userId}
      />
    </SafeAreaView>
  );
});
