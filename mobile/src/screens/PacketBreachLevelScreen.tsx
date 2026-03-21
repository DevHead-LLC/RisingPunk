import React, { useState, useEffect } from 'react';
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
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getCurrentBalance } from '../store/slices/balanceSlice';
import {
  useGetPacketBreachStatusQuery,
  useStartPacketBreachSessionMutation,
  type PacketBreachLevelConfig,
  type PacketBreachSessionResponse,
} from '../store/api/packetBreachApi';
import { balanceApi } from '../store/api/balanceApi';
import { TIER_CONFIGS } from '../utils/programmingFacilityTierConfig';
import { ProgrammingFacilityLevelCell } from '../components/programmingFacility/ProgrammingFacilityLevelCell';
import { useProgrammingFacilityLevelScreen } from '../hooks/useProgrammingFacilityLevelScreen';

const GAME_RULES_TEXT = `PACKET BREACH — HOW TO PLAY

OBJECTIVE
Breach a secure data node by sending the correct sequence of packets (nodes). When your sequence exactly matches the hidden solution, you complete the level.

NODE POOL
A grid of nodes is shown for each level. Each node has:
• Protocol (e.g. TCP, UDP, SSH)
• Port number
Tap nodes to build your sequence, then submit one guess at a time.

ATTEMPTS
Each level gives you a limited number of guess attempts. You pick a sequence of nodes (same length as the solution) and submit it as one guess. Each attempt costs the level's fee, deducted from your balance when you submit. When you run out of attempts or balance, the level ends for that session.

GUESS RESPONSES (HINTS)
After each guess you get counts only — which slot is which is not revealed:
• Routed — A packet that is correct and in the correct position in the sequence.
• Misrouted — A packet that is correct but in the wrong position.
• Rejected — A packet that does not belong in the solution (wrong choice or breaks the rule).
Use these counts to narrow down the solution on your next guess.

RULES BY TIER
• From level 1: Every level has a hidden trap (anti-solution) sequence. If your guess exactly matches this trap sequence, you lose all remaining attempts for that run ("You've Been Traced!"). Use the Routed / Misrouted / Rejected hints to avoid the trap and find the real solution.
• Tiers 1–6: The solution is a hidden sequence of three nodes from a pool of three. It is randomized each time you start or retry a level.
• Tier 7–12: The node pool has four nodes; one is a decoy (you don't know which). The solution uses only three of them. If you include the decoy in your sequence, that attempt returns no hint (no Routed/Misrouted/Rejected). The anti-solution (trap) still applies.
• Tier 13 and above: The node pool has five nodes; one is a decoy. The solution uses three of the other four. Same decoy rule: including the decoy gives no hint. The anti-solution (trap) still applies.

WIN
Your sequence exactly matches the solution → you breach the node and complete the level. Complete all levels in a tier to unlock that tier's Brute reward.`;

type PacketBreachLevelScreenProps = {
  onClose: () => void;
  /** levelId and optional session from startSession (avoids game screen calling startSession again and double-charging). */
  onSelectLevel: (levelId: string, session?: PacketBreachSessionResponse) => void;
};

const ENTRY_DEDUCTION_DELAY_MS = 1000;

export function PacketBreachLevelScreen({ onClose, onSelectLevel }: PacketBreachLevelScreenProps) {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const [showRules, setShowRules] = useState(false);
  const balance = useAppSelector(getCurrentBalance);
  const { data: status, isLoading, error } = useGetPacketBreachStatusQuery(undefined, {
    pollingInterval: 60000,
  });
  const [startSessionMutation] = useStartPacketBreachSessionMutation();

  useEffect(() => {
    dispatch(balanceApi.util.invalidateTags(['Balance']));
  }, [dispatch]);

  const levelConfigs = status?.levelConfigs ?? [];
  const numericBalance = typeof balance === 'number' ? balance : 0;

  const { startingLevelId, handleClose, handleSelectLevel } = useProgrammingFacilityLevelScreen<PacketBreachSessionResponse>({
    levelConfigs,
    numericBalance,
    startSession: (levelId) => startSessionMutation(levelId).unwrap(),
    onSelectLevel,
    onClose,
    entryDeductionDelayMs: ENTRY_DEDUCTION_DELAY_MS,
    onStartSessionError: (err) => {
      if ((err as { status?: number })?.status === 402) {
        // Insufficient funds (e.g. balance changed); no further handling
      }
    },
  });

  const getTierLevels = (tier: number) => levelConfigs.filter((c) => c.tier === tier);
  const isTierAchieved = (tier: number) => {
    const levels = getTierLevels(tier);
    return levels.length === 5 && levels.every((c) => c.isCompleted);
  };

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
      <Text style={[styles.title, { color: colors.primary }]}>Program Brute for Tiered Awards</Text>
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
                        costLabelSuffix=" per attempt"
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
                  accessibilityLabel={achieved ? `Tier ${tier} reward unlocked: ${rewardLabel}` : `Tier ${tier} reward: complete levels ${levelRange} to unlock ${rewardLabel}`}
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
              style={[styles.rulesClose, { borderColor: colors.primary }]}
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
  rulesButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.md,
  },
  rulesButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
  },
  loader: {
    marginTop: SIZING.spacing.xl,
  },
  tierScroll: {
    flex: 1,
  },
  tierScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  tierRow: {
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.lg,
    flexWrap: 'wrap',
  },
  tierLeft: {
    flexDirection: 'column',
  },
  tierLabel: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZING.spacing.sm,
  },
  tierRewardBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRewardTitle: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  tierRewardValue: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
    marginBottom: SIZING.spacing.xs,
  },
  tierRewardHint: {
    fontSize: SIZING.font.small,
  },
  errorText: {
    fontSize: SIZING.font.body,
    marginTop: SIZING.spacing.lg,
  },
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
  rulesText: {
    fontSize: SIZING.font.small,
    lineHeight: 22,
  },
  rulesClose: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.md,
    alignSelf: 'flex-end',
    marginTop: SIZING.spacing.md,
  },
  rulesCloseText: {
    fontSize: SIZING.font.small,
  },
});
