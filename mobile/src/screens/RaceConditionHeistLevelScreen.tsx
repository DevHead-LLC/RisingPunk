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
  { tier: 10, rewardLabel: 'Attack +2', levelRange: '10.1–10.5' },
  { tier: 11, rewardLabel: 'Health +4', levelRange: '11.1–11.5' },
  { tier: 12, rewardLabel: 'Defense +0.70%', levelRange: '12.1–12.5' },
  { tier: 13, rewardLabel: 'Attack +2.5', levelRange: '13.1–13.5' },
  { tier: 14, rewardLabel: 'Health +5', levelRange: '14.1–14.5' },
  { tier: 15, rewardLabel: 'Defense +0.90%', levelRange: '15.1–15.5' },
  { tier: 16, rewardLabel: 'Attack +3', levelRange: '16.1–16.5' },
  { tier: 17, rewardLabel: 'Health +6', levelRange: '17.1–17.5' },
  { tier: 18, rewardLabel: 'Defense +1.10%', levelRange: '18.1–18.5' },
  { tier: 19, rewardLabel: 'Attack +3.5', levelRange: '19.1–19.5' },
  { tier: 20, rewardLabel: 'Health +7', levelRange: '20.1–20.5' },
  { tier: 21, rewardLabel: 'Defense +1.30%', levelRange: '21.1–21.5' },
];

const GAME_RULES_TEXT = `RACE CONDITION HEIST — HOW TO PLAY

OBJECTIVE
Figure out the pattern and exploit the server before time runs out. You have one timer: the match clock. Later tiers have less time and faster word cycles.

THE PATTERN
Words rotate one at a time. The last word in each cycle is always a "secure" word (Lock, Encrypt, Secure, Shield, Harden, Sanitize, Seal, Guard, etc.). Tap the action when the word BEFORE that secure word appears — that's your only window. If you tap on any other word (except the secure word on tiers 5+), you miss and your combo resets. Early tiers use 3-word cycles; tiers 4 and 5 use 4-word cycles.

ACTIONS
• Watch the rotating word.
• Tap the action for the current node (Exploit, Encrypt, Exfiltrate, or Bypass) when you see the word that comes right before the secure word in the cycle.
• Never tap when the secure word is showing (tiers 5 and above — see FATAL FAILURE below).

MULTI-NODE TIERS (2, 3, 4, 5)
• Tier 2: two nodes (Exploit, then Encrypt). Tier 3: three (Exploit → Encrypt → Exfiltrate). Tiers 4 and 5: four nodes (Exploit → Encrypt → Exfiltrate → Bypass). Each phase gets a new word set; capture all nodes to pass. Tier 5 has a faster word cycle and less time than tier 4.

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

function formatCost(cost: number): string {
  return `$${cost.toLocaleString()}`;
}

function LevelCell({
  config,
  colors,
  onPress,
  canAfford,
  isSessionStarting,
  isThisLevelStarting,
}: {
  config: RaceConditionHeistLevelConfig;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
  canAfford: boolean;
  isSessionStarting: boolean;
  isThisLevelStarting: boolean;
}) {
  const canTap = config.isUnlocked && !config.isCompleted && canAfford && !isSessionStarting;
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
      {isThisLevelStarting && (
        <View style={styles.levelOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {config.isCompleted && !isThisLevelStarting && (
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
        disabled={!canAfford || isSessionStarting}
        accessible
        accessibilityLabel={`Level ${config.levelId}, ${costLabel}. Tap to play.`}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

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
                      <LevelCell
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
  levelBox: {
    width: 56,
    paddingVertical: SIZING.spacing.xs,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  levelBoxLocked: { opacity: 0.5 },
  levelBoxCompleted: { opacity: 0.8 },
  levelBoxCantAfford: { opacity: 0.7 },
  levelOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
  },
  defeatedX: { fontSize: 20, fontWeight: '700' },
  levelLabel: { fontSize: SIZING.font.small },
  levelCost: { fontSize: 10 },
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
