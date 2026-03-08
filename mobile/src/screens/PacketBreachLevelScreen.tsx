import React, { useState, useCallback } from 'react';
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
  useGetPacketBreachStatusQuery,
  useStartPacketBreachSessionMutation,
  type PacketBreachLevelConfig,
  type PacketBreachSessionResponse,
} from '../store/api/packetBreachApi';

/** Tier reward label and level range for display; order matches tier number. Tiers 7–9 use 4-node pool and Decoy. */
const TIER_CONFIGS: { tier: number; rewardLabel: string; levelRange: string }[] = [
  { tier: 1, rewardLabel: 'Attack +0.5', levelRange: '1.1–1.5' },
  { tier: 2, rewardLabel: 'Health +1', levelRange: '2.1–2.5' },
  { tier: 3, rewardLabel: 'Defense +0.10%', levelRange: '3.1–3.5' },
  { tier: 4, rewardLabel: 'Attack +1', levelRange: '4.1–4.5' },
  { tier: 5, rewardLabel: 'Health +2', levelRange: '5.1–5.5' },
  { tier: 6, rewardLabel: 'Defense +0.30%', levelRange: '6.1–6.5' },
  { tier: 7, rewardLabel: 'Attack +1.5', levelRange: '7.1–7.5' },
  { tier: 8, rewardLabel: 'Health +3', levelRange: '8.1–8.5' },
  { tier: 9, rewardLabel: 'Defense +0.50%', levelRange: '9.1–9.5' },
];

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
• Tier 7 and above: The node pool has four nodes; one is a decoy (you don't know which). The solution uses only three of them. If you include the decoy in your sequence, that attempt returns no hint (no Routed/Misrouted/Rejected). The anti-solution (trap) still applies.

WIN
Your sequence exactly matches the solution → you breach the node and complete the level. Complete all levels in a tier to unlock that tier's Infantry reward.`;

type PacketBreachLevelScreenProps = {
  onClose: () => void;
  /** levelId and optional session from startSession (avoids game screen calling startSession again and double-charging). */
  onSelectLevel: (levelId: string, session?: PacketBreachSessionResponse) => void;
};

function formatCost(cost: number): string {
  return `$${cost.toLocaleString()}`;
}

function LevelCell({
  config,
  colors,
  onPress,
  canAfford,
  isStarting,
}: {
  config: PacketBreachLevelConfig;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
  canAfford: boolean;
  isStarting?: boolean;
}) {
  const canTap = config.isUnlocked && !config.isCompleted && canAfford && !isStarting;
  const costLabel = formatCost(config.cost ?? 0);
  const content = (
    <View
      style={[
        styles.levelBox,
        { borderColor: colors.primary },
        !config.isUnlocked && styles.levelBoxLocked,
        config.isCompleted && styles.levelBoxCompleted,
        config.isUnlocked && !config.isCompleted && !canAfford && styles.levelBoxCantAfford,
      ]}
    >
      <Text style={[styles.levelLabel, { color: colors.text?.secondary ?? colors.primary }]}>
        {config.levelId}
      </Text>
      <Text style={[styles.levelCost, { color: colors.text?.secondary ?? colors.primary }]}>
        {costLabel}
      </Text>
      {isStarting && (
        <View style={styles.levelOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {config.isCompleted && !isStarting && (
        <View style={styles.levelOverlay} pointerEvents="none">
          <Text style={[styles.defeatedX, { color: colors.error }]}>✗</Text>
        </View>
      )}
    </View>
  );
  if (config.isUnlocked && !config.isCompleted) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!canAfford || isStarting}
        accessible
        accessibilityLabel={
          isStarting
            ? `Level ${config.levelId}, starting...`
            : canAfford
              ? `Level ${config.levelId}, ${costLabel} per attempt. Tap to play.`
              : `Level ${config.levelId}, ${costLabel}. Insufficient funds.`
        }
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const ENTRY_DEDUCTION_DELAY_MS = 1000;

export function PacketBreachLevelScreen({ onClose, onSelectLevel }: PacketBreachLevelScreenProps) {
  const colors = useThemeColors();
  const [showRules, setShowRules] = useState(false);
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);
  const balance = useAppSelector(getCurrentBalance);
  const { data: status, isLoading, error } = useGetPacketBreachStatusQuery(undefined, {
    pollingInterval: 60000,
  });
  const [startSession] = useStartPacketBreachSessionMutation();

  const levelConfigs = status?.levelConfigs ?? [];
  const numericBalance = typeof balance === 'number' ? balance : 0;

  const getTierLevels = (tier: number) => levelConfigs.filter((c) => c.tier === tier);
  const isTierAchieved = (tier: number) => {
    const levels = getTierLevels(tier);
    return levels.length === 5 && levels.every((c) => c.isCompleted);
  };

  const handleSelectLevel = useCallback(
    async (levelId: string) => {
      const config = (status?.levelConfigs ?? []).find((c) => c.levelId === levelId);
      if (!config?.isUnlocked || config?.isCompleted || numericBalance < (config.cost ?? 0)) return;
      setStartingLevelId(levelId);
      try {
        const result = await startSession(levelId).unwrap();
        setTimeout(() => {
          setStartingLevelId(null);
          onSelectLevel(levelId, result);
        }, ENTRY_DEDUCTION_DELAY_MS);
      } catch (err: unknown) {
        setStartingLevelId(null);
        const statusCode = (err as { status?: number })?.status;
        if (statusCode === 402) {
          // Insufficient funds (e.g. balance changed); don't navigate
          return;
        }
        throw err;
      }
    },
    [status?.levelConfigs, numericBalance, startSession, onSelectLevel]
  );

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <CloseButton onPress={onClose} />
        <Text style={[styles.errorText, { color: colors.error }]}>Failed to load levels.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onClose} />
      <Balance />
      <Text style={[styles.title, { color: colors.primary }]}>Program Infantry for Tiered Awards</Text>
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
                      <LevelCell
                        key={config.levelId}
                        config={config}
                        colors={colors}
                        onPress={() => handleSelectLevel(config.levelId)}
                        canAfford={numericBalance >= (config.cost ?? 0)}
                        isStarting={startingLevelId === config.levelId}
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
  levelBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  levelBoxLocked: {
    opacity: 0.5,
  },
  levelBoxCompleted: {
    opacity: 0.9,
  },
  levelLabel: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  levelCost: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  levelBoxCantAfford: {
    opacity: 0.7,
  },
  levelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defeatedX: {
    fontSize: 24,
    fontWeight: '700',
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
