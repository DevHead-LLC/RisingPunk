/**
 * @file BattleGridScreen.tsx
 * @description Main battle screen container - orchestrates battle components (live poll or replay playback).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  SafeAreaView,
  Text,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useAppSelector } from '../store/hooks';
import { BattleNetworkGrid } from '../components/battle/BattleNetworkGrid';
import { BattleBattalionManager } from '../components/battle/BattleBattalionManager';
import { BattleOverlayManager } from '../components/battle/BattleOverlayManager';
import { ReviewPromptModal } from '../components/profile/ReviewPromptModal';
import { createThemeAwareBattleGridStyles } from '../styles/battleGridStyles';
import { useThemeColors } from '../hooks/useThemeColors';
import { useReplayPlayback } from '../hooks/useReplayPlayback';
import { mapBattleStateToViewport, computeReplayLetterbox } from '../utils/replayViewportTransform';
import { getHasOpenedReview, getHasSeenReviewPrompt, setReviewPromptSeen } from '../utils/openReviewAndClaimReward';

type Props = {
  _onClose?: () => void;
  battleId: string;
  mode?: 'live' | 'replay';
};

export const BattleGridScreen = React.memo(({ _onClose, battleId, mode = 'live' }: Props) => {
  const colors = useThemeColors();
  const themeStyles = createThemeAwareBattleGridStyles(colors);
  const userId = useAppSelector((state) => state.auth.user?._id);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const isReplay = mode === 'replay';
  const { width: vw, height: vh } = useWindowDimensions();

  const replay = useReplayPlayback(isReplay ? battleId : null);

  const viewportBattleState = useMemo(() => {
    if (!isReplay || !replay.replayDoc || !replay.battleState) return null;
    return mapBattleStateToViewport(
      replay.battleState,
      replay.replayDoc.canonicalScreenWidth,
      replay.replayDoc.canonicalScreenHeight,
      vw,
      vh
    );
  }, [isReplay, replay.replayDoc, replay.battleState, vw, vh]);

  const layoutScale = useMemo(() => {
    if (!isReplay || !replay.replayDoc) return 1;
    return computeReplayLetterbox(
      replay.replayDoc.canonicalScreenWidth,
      replay.replayDoc.canonicalScreenHeight,
      vw,
      vh
    ).scale;
  }, [isReplay, replay.replayDoc, vw, vh]);

  const nodeSize = Math.max(8, Math.round(20 * layoutScale));
  const lineW = Math.max(1, 2 * layoutScale);
  const battalionSize = Math.max(12, Math.round(35 * layoutScale));

  const handleUserWin = useCallback(() => {
    if (isReplay) return;
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
  }, [userId, isReplay]);

  const handleReviewPromptClose = useCallback(() => {
    if (userId) setReviewPromptSeen(userId);
    setShowReviewPrompt(false);
  }, [userId]);

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

  if (isReplay && vw < vh) {
    return (
      <SafeAreaView style={themeStyles.container} testID="battle-grid-screen">
        <View style={themeStyles.loadingContainer}>
          <Text style={themeStyles.errorText}>Replay requires landscape</Text>
          <Text style={themeStyles.errorSubtext}>Rotate your device to watch this battle.</Text>
          {_onClose ? (
            <Pressable onPress={_onClose} style={replayStyles.closeBtn} accessibilityRole="button">
              <Text style={[themeStyles.errorSubtext, { color: colors.primary }]}>Close</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  if (isReplay && replay.isError) {
    return (
      <SafeAreaView style={themeStyles.container} testID="battle-grid-screen">
        <View style={themeStyles.loadingContainer}>
          <Text style={themeStyles.errorText}>Could not load replay</Text>
          <Text style={themeStyles.errorSubtext}>
            {replay.error && typeof replay.error === 'object' && 'message' in replay.error
              ? String((replay.error as Error).message)
              : 'No recording for this battle, or you may not have access.'}
          </Text>
          {_onClose ? (
            <Pressable onPress={_onClose} style={replayStyles.closeBtn} accessibilityRole="button">
              <Text style={[themeStyles.errorSubtext, { color: colors.primary }]}>Close</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  if (isReplay && replay.isLoading && !replay.replayDoc) {
    return (
      <SafeAreaView style={themeStyles.container} testID="battle-grid-screen">
        <View style={themeStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={themeStyles.loadingText}>Loading replay…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isReplay && replay.replayDoc && replay.totalFrames === 0) {
    return (
      <SafeAreaView style={themeStyles.container} testID="battle-grid-screen">
        <View style={themeStyles.loadingContainer}>
          <Text style={themeStyles.errorText}>Replay is empty</Text>
          {_onClose ? (
            <Pressable onPress={_onClose} style={replayStyles.closeBtn} accessibilityRole="button">
              <Text style={[themeStyles.errorSubtext, { color: colors.primary }]}>Close</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const overrideState = isReplay ? viewportBattleState : undefined;

  return (
    <SafeAreaView style={themeStyles.container} testID="battle-grid-screen">
      {isReplay ? (
        <View
          style={[
            replayStyles.replayBadge,
            { backgroundColor: colors.error, borderColor: colors.text.primary },
          ]}
          accessibilityRole="text"
        >
          <Text style={[replayStyles.replayBadgeText, { color: colors.text.primary }]}>REPLAY</Text>
        </View>
      ) : null}
      <View style={themeStyles.battleArea}>
        <BattleOverlayManager
          battleId={battleId}
          onClose={_onClose}
          onUserWin={handleUserWin}
          overrideBattleState={overrideState}
          isReplay={isReplay}
        />

        <View
          style={[
            themeStyles.networkContainer,
            { width: vw, height: vh },
          ]}
        >
          <BattleNetworkGrid
            battleId={battleId}
            nodeSize={nodeSize}
            lineWidth={lineW}
            showNodeLabels={true}
            overrideBattleState={overrideState}
          />

          <BattleBattalionManager
            battleId={battleId}
            battalionSize={battalionSize}
            showHealthBars={true}
            overrideBattleState={overrideState}
          />
        </View>
      </View>
      {!isReplay ? (
        <ReviewPromptModal
          visible={showReviewPrompt}
          onClose={handleReviewPromptClose}
          userId={userId}
        />
      ) : null}
    </SafeAreaView>
  );
});

const replayStyles = StyleSheet.create({
  replayBadge: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    zIndex: 50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  replayBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    marginTop: 16,
    padding: 12,
  },
});
