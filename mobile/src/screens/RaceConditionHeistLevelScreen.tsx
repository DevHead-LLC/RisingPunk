import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { Balance } from '../components/common/Balance';
import { SIZING } from '../styles/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAppSelector } from '../store/hooks';
import { getCurrentBalance } from '../store/slices/balanceSlice';
import {
  useGetRaceConditionHeistStatusQuery,
  useStartRaceConditionHeistSessionMutation,
  type RaceConditionHeistLevelConfig,
  type RaceConditionHeistSessionResponse,
} from '../store/api/raceConditionHeistApi';
import { TIER_CONFIGS } from '../utils/programmingFacilityTierConfig';
import { ProgrammingFacilityLevelCell } from '../components/programmingFacility/ProgrammingFacilityLevelCell';

const GAME_RULES_TEXT = `RACE CONDITION HEIST — HOW TO PLAY

OBJECTIVE
Figure out the pattern and exploit the server before time runs out. You have one timer: the match clock. Later tiers have less time and faster word cycles.

THE PATTERN
Words rotate one at a time. The last word in each cycle is always a "secure" word (Lock, Encrypt, Secure, Shield, Harden, Sanitize, Seal, Guard, etc.). Tap the action when the word BEFORE that secure word appears — that's your only window. If you tap on any other word (except the secure word on tiers 5+), you miss and your combo resets. Word cycles: tiers 1–3 = 3 words; tiers 4–5 = 4 words; tier 6 = 5 words; tier 7 = 6 words; tier 8 = 7 words; tier 9 = 8 words; tiers 10–21 = 10 words (max).

ACTIONS
• Watch the rotating word.
• Tap the action for the current node (Exploit, Encrypt, Exfiltrate, Bypass, Extract, Offload, Purge, and on higher tiers Wipe, Scrub, Flush) when you see the word that comes right before the secure word in the cycle.
• Never tap when the secure word is showing (tiers 5 and above — see FATAL FAILURE below).

MULTI-NODE TIERS (2–21)
• Tier 2: two nodes. Tier 3: three. Tiers 4–5: four nodes. Tier 6: five. Tier 7: six. Tier 8: seven (… Offload → Purge). Tier 9–11: eight nodes (… Purge → Wipe). Tier 12–13: nine nodes (… Wipe → Scrub). Tier 14–15: ten nodes (… Scrub → Flush). Tier 16–17: eleven. Tier 18–19: twelve. Tier 20–21: thirteen. The packet row scrolls when there are 6 or more nodes. Each phase gets a new word set; capture all nodes to pass. Required score = number of nodes × 50 (e.g. tier 15 = 10 nodes, need 500). Tiers 5+ have faster word cycles and less time; tiers 9+ use 8- or 10-word cycles and longer wrong-word cooldowns.

FATAL FAILURE (tiers 5 and above)
• If you tap when the secure word is displayed, you are traced immediately: "You've been traced! FATAL FAILURE." The run ends and you are returned to level select. No second chances — start a new run to try again.

SCORING
Score = packet value × exploit multiplier × combo. Combo builds when you steal in quick succession (2 = 1.2×, 4 = 1.5×, 6 = 2×). Failed exploit resets combo.

TIER REWARDS
Complete all 5 levels in a tier to unlock that tier's Cavalry (Guardian) stat reward.`;

type RaceConditionHeistLevelScreenProps = {
  onClose: () => void;
  onSelectLevel: (levelId: string, session?: RaceConditionHeistSessionResponse) => void;
};

const ENTRY_DEDUCTION_DELAY_MS = 1000;

export function RaceConditionHeistLevelScreen({ onClose, onSelectLevel }: RaceConditionHeistLevelScreenProps) {
  const colors = useThemeColors();
  const [showRules, setShowRules] = useState(false);
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);
  const entryDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingLevelRef = useRef(false);
  const balance = useAppSelector(getCurrentBalance);
  const { data: status, isLoading, error } = useGetRaceConditionHeistStatusQuery(undefined, {
    pollingInterval: 60000,
    refetchOnFocus: true,
  });
  const [startSession] = useStartRaceConditionHeistSessionMutation();

  useEffect(() => {
    return () => {
      if (entryDelayTimeoutRef.current != null) {
        clearTimeout(entryDelayTimeoutRef.current);
        entryDelayTimeoutRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (entryDelayTimeoutRef.current != null) {
      clearTimeout(entryDelayTimeoutRef.current);
      entryDelayTimeoutRef.current = null;
    }
    isSelectingLevelRef.current = false;
    onClose();
  }, [onClose]);

  const levelConfigs = status?.levelConfigs ?? [];
  const numericBalance = typeof balance === 'number' ? balance : 0;

  const getTierLevels = (tier: number) => levelConfigs.filter((c) => c.tier === tier);
  const isTierAchieved = (tier: number) => {
    const levels = getTierLevels(tier);
    return levels.length === 5 && levels.every((c) => c.isCompleted);
  };

  const handleSelectLevel = useCallback(
    async (levelId: string) => {
      if (isSelectingLevelRef.current) return;
      const config = (status?.levelConfigs ?? []).find((c) => c.levelId === levelId);
      if (!config?.isUnlocked || config?.isCompleted || numericBalance < (config.cost ?? 0)) return;
      isSelectingLevelRef.current = true;
      if (entryDelayTimeoutRef.current != null) {
        clearTimeout(entryDelayTimeoutRef.current);
        entryDelayTimeoutRef.current = null;
      }
      setStartingLevelId(levelId);
      try {
        const result = await startSession(levelId).unwrap();
        entryDelayTimeoutRef.current = setTimeout(() => {
          entryDelayTimeoutRef.current = null;
          isSelectingLevelRef.current = false;
          setStartingLevelId(null);
          onSelectLevel(levelId, result);
        }, ENTRY_DEDUCTION_DELAY_MS);
      } catch (err: unknown) {
        isSelectingLevelRef.current = false;
        setStartingLevelId(null);
        if ((err as { status?: number })?.status === 402) return;
      }
    },
    [status?.levelConfigs, numericBalance, startSession, onSelectLevel]
  );

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={handleClose} />
        <Text style={[styles.errorText, { color: colors.error }]}>Failed to load levels.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={handleClose} />
      <Balance />
      <Text style={[styles.title, { color: colors.primary }]}>Program Cavalry for Tiered Awards</Text>
      <TouchableOpacity
        onPress={() => setShowRules(true)}
        style={[styles.rulesButton, { borderColor: colors.primary }]}
        accessible
        accessibilityLabel="Game rules"
        accessibilityRole="button"
      >
        <Text style={[styles.rulesButtonText, { color: colors.primary }]}>Game Rules</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView style={styles.tierScroll} contentContainerStyle={styles.tierScrollContent} showsVerticalScrollIndicator={true}>
          {TIER_CONFIGS.map(({ tier, rewardLabel, levelRange }) => {
            const tierLevels = getTierLevels(tier);
            const achieved = isTierAchieved(tier);
            return (
              <View key={tier} style={styles.tierRow}>
                <View style={styles.tierLeft}>
                  <Text style={[styles.tierLabel, { color: colors.text?.secondary ?? colors.primary }]}>
                    Tier {tier}
                  </Text>
                  <View style={styles.levelRow}>
                    {tierLevels.map((config) => (
                      <ProgrammingFacilityLevelCell
                        key={config.levelId}
                        config={config}
                        colors={colors}
                        onPress={() => handleSelectLevel(config.levelId)}
                        canAfford={numericBalance >= (config.cost ?? 0)}
                        isSessionStarting={startingLevelId !== null}
                        isThisLevelStarting={startingLevelId === config.levelId}
                      />
                    ))}
                  </View>
                </View>
                <View
                  style={[
                    styles.tierRewardBox,
                    { borderColor: colors.primary },
                    achieved && { borderColor: colors.success ?? colors.matrix ?? colors.primary },
                  ]}
                  accessible
                  accessibilityLabel={
                    achieved
                      ? `Tier ${tier} reward unlocked: ${rewardLabel}`
                      : `Tier ${tier} reward: complete levels ${levelRange} to unlock ${rewardLabel}`
                  }
                  accessibilityRole="text"
                >
                  <Text style={[styles.tierRewardTitle, { color: colors.text?.secondary ?? colors.primary }]}>
                    Tier Reward
                  </Text>
                  <Text
                    style={[
                      styles.tierRewardValue,
                      {
                        color: achieved
                          ? (colors.success ?? colors.matrix ?? colors.primary)
                          : (colors.text?.secondary ?? colors.primary),
                      },
                    ]}
                  >
                    {rewardLabel}
                  </Text>
                  <Text
                    style={[
                      styles.tierRewardHint,
                      {
                        color: achieved
                          ? (colors.success ?? colors.matrix ?? colors.primary)
                          : (colors.text?.secondary ?? colors.primary),
                      },
                    ]}
                  >
                    {achieved ? '✓ Unlocked' : `Complete ${levelRange} to unlock`}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={showRules}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRules(false)}
        statusBarTranslucent
        supportedOrientations={['landscape-left', 'landscape-right']}
      >
        <View style={styles.rulesOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowRules(false)}
            accessibilityLabel="Dismiss rules"
            accessibilityRole="button"
          />
          <View
            style={[styles.rulesBox, { backgroundColor: colors.background, borderColor: colors.primary }]}
            pointerEvents="box-none"
          >
            <ScrollView
              style={styles.rulesScroll}
              contentContainerStyle={styles.rulesScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.rulesText, { color: colors.text?.secondary ?? colors.primary }]}>
                {GAME_RULES_TEXT}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.rulesCloseBtn, { borderColor: colors.primary }]}
              onPress={() => setShowRules(false)}
            >
              <Text style={[styles.rulesCloseText, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SIZING.spacing.lg,
    paddingTop: 56,
  },
  title: {
    fontSize: SIZING.font.large,
    fontWeight: '600',
    marginBottom: SIZING.spacing.md,
  },
  errorText: { fontSize: SIZING.font.body, textAlign: 'center', marginTop: SIZING.spacing.lg },
  rulesButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.md,
  },
  rulesButtonText: { fontSize: SIZING.font.small, fontWeight: '500' },
  loader: { marginTop: SIZING.spacing.xl },
  tierScroll: { flex: 1 },
  tierScrollContent: { paddingBottom: SIZING.spacing.lg },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.lg,
    flexWrap: 'wrap',
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.lg,
  },
  tierLeft: { flexDirection: 'column' },
  tierLabel: { fontSize: SIZING.font.body, fontWeight: '600', marginBottom: SIZING.spacing.xs },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZING.spacing.sm },
  tierRewardBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRewardTitle: { fontSize: SIZING.font.small, fontWeight: '600', marginBottom: SIZING.spacing.xs },
  tierRewardValue: { fontSize: SIZING.font.body, fontWeight: '700', marginBottom: SIZING.spacing.xs },
  tierRewardHint: { fontSize: SIZING.font.small },
  rulesOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  rulesBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.lg,
    maxWidth: 420,
    width: '90%',
    maxHeight: '85%',
    minHeight: 200,
  },
  rulesScroll: {
    height: 420,
    alignSelf: 'stretch',
  },
  rulesScrollContent: {
    paddingRight: SIZING.spacing.sm,
    paddingBottom: SIZING.spacing.lg,
  },
  rulesText: { fontSize: SIZING.font.small, lineHeight: 22 },
  rulesCloseBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.md,
    alignSelf: 'flex-end',
    marginTop: SIZING.spacing.md,
  },
  rulesCloseText: { fontSize: SIZING.font.small },
});
