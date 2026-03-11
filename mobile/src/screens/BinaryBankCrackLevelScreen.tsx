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
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getCurrentBalance } from '../store/slices/balanceSlice';
import {
  useGetBinaryBankCrackStatusQuery,
  useStartBinaryBankCrackSessionMutation,
  type BinaryBankCrackLevelConfig,
  type BinaryBankCrackSessionResponse,
} from '../store/api/binaryBankCrackApi';
import { balanceApi } from '../store/api/balanceApi';

const TIER_COUNT = 21;

function getTierRewardLabel(tier: number): string {
  const range = 0.5 + (tier - 1) * 0.25;
  return `Range +${range.toFixed(2)}`;
}

function getTierLevelRange(tier: number): string {
  return `${tier}.1–${tier}.5`;
}

const GAME_RULES_TEXT = `BINARY BANK CRACK — HOW TO PLAY

OBJECTIVE
Crack the vault by converting each decimal number into its correct binary value using the bit switches. Solve all combinations before the timer or flip limit runs out.

COMBINATIONS
• Each level has a set number of target numbers (combinations) to crack.
• Each combination is a binary register (4–16 bits depending on tier).
• Set the bits to match each target decimal, then submit.

FLOW
• Set all registers to match the target numbers shown, then submit.
• VALUE MISMATCH → flips are consumed; try again.
• When all combinations are correct, the vault cracks and you win.

LIMITS
• Flip limit: min flips needed to solve + accidental flips (tier-based).
• Timer: complete before time expires or the system locks down.

TIER REWARDS
Complete all five levels in a tier to unlock that tier's Range bonus for Phreaks.`;

type BinaryBankCrackLevelScreenProps = {
  onClose: () => void;
  onSelectLevel: (levelId: string, session?: BinaryBankCrackSessionResponse) => void;
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
  config: BinaryBankCrackLevelConfig;
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
        accessibilityLabel={
          isThisLevelStarting
            ? `Level ${config.levelId}, starting...`
            : canAfford
              ? `Level ${config.levelId}, ${costLabel}. Tap to play.`
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

export function BinaryBankCrackLevelScreen({ onClose, onSelectLevel }: BinaryBankCrackLevelScreenProps) {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const [showRules, setShowRules] = useState(false);
  const [startingLevelId, setStartingLevelId] = useState<string | null>(null);
  const entryDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSelectingLevelRef = useRef(false);
  const balance = useAppSelector(getCurrentBalance);
  const { data: status, isLoading, error } = useGetBinaryBankCrackStatusQuery(undefined, {
    pollingInterval: 60000,
  });
  const [startSession] = useStartBinaryBankCrackSessionMutation();

  useEffect(() => {
    dispatch(balanceApi.util.invalidateTags(['Balance']));
  }, [dispatch]);

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

  const handleSelectLevel = useCallback(
    async (levelId: string) => {
      if (isSelectingLevelRef.current) return;
      const config = levelConfigs.find((c) => c.levelId === levelId);
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
      } catch {
        isSelectingLevelRef.current = false;
        setStartingLevelId(null);
      }
    },
    [levelConfigs, numericBalance, startSession, onSelectLevel]
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
      <Text style={[styles.title, { color: colors.primary }]}>Program Phreaks for Range</Text>
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
        <ScrollView style={styles.tierScroll} contentContainerStyle={styles.tierScrollContent} showsVerticalScrollIndicator>
          {Array.from({ length: TIER_COUNT }, (_, i) => i + 1).map((tier) => {
            const tierLevels = levelConfigs.filter((c) => c.tier === tier);
            const isTierAchieved = tierLevels.length === 5 && tierLevels.every((c) => c.isCompleted);
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
                    isTierAchieved && { borderColor: colors.success ?? colors.matrix ?? colors.primary },
                  ]}
                >
                  <Text style={[styles.tierRewardTitle, { color: colors.text?.secondary ?? colors.primary }]}>
                    Tier Reward
                  </Text>
                  <Text
                    style={[
                      styles.tierRewardValue,
                      {
                        color: isTierAchieved
                          ? (colors.success ?? colors.matrix ?? colors.primary)
                          : (colors.text?.secondary ?? colors.primary),
                      },
                    ]}
                  >
                    {getTierRewardLabel(tier)}
                  </Text>
                  <Text
                    style={[
                      styles.tierRewardHint,
                      {
                        color: isTierAchieved
                          ? (colors.success ?? colors.matrix ?? colors.primary)
                          : (colors.text?.secondary ?? colors.primary),
                      },
                    ]}
                  >
                    {isTierAchieved ? '✓ Unlocked' : `Complete ${getTierLevelRange(tier)} to unlock`}
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
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowRules(false)} />
          <View style={[styles.rulesBox, { backgroundColor: colors.background, borderColor: colors.primary }]} pointerEvents="box-none">
            <ScrollView style={styles.rulesScroll} contentContainerStyle={styles.rulesScrollContent} showsVerticalScrollIndicator>
              <Text style={[styles.rulesText, { color: colors.text?.secondary ?? colors.primary }]}>
                {GAME_RULES_TEXT}
              </Text>
            </ScrollView>
            <TouchableOpacity style={[styles.rulesClose, { borderColor: colors.primary }]} onPress={() => setShowRules(false)}>
              <Text style={[styles.rulesCloseText, { color: colors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: SIZING.spacing.lg, paddingTop: 56 },
  title: { fontSize: SIZING.font.large, fontWeight: '600', marginBottom: SIZING.spacing.md },
  rulesButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingVertical: SIZING.spacing.xs, paddingHorizontal: SIZING.spacing.sm, marginBottom: SIZING.spacing.md },
  rulesButtonText: { fontSize: SIZING.font.small, fontWeight: '500' },
  loader: { marginTop: SIZING.spacing.xl },
  tierScroll: { flex: 1 },
  tierScrollContent: { paddingBottom: SIZING.spacing.lg },
  tierRow: { marginTop: SIZING.spacing.sm, marginBottom: SIZING.spacing.lg, flexDirection: 'row', alignItems: 'center', gap: SIZING.spacing.lg, flexWrap: 'wrap' },
  tierLeft: { flexDirection: 'column' },
  tierLabel: { fontSize: SIZING.font.body, fontWeight: '600', marginBottom: SIZING.spacing.xs },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZING.spacing.sm },
  tierRewardBox: { borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.md, minWidth: 160, alignItems: 'center', justifyContent: 'center' },
  tierRewardTitle: { fontSize: SIZING.font.small, fontWeight: '600', marginBottom: SIZING.spacing.xs },
  tierRewardValue: { fontSize: SIZING.font.body, fontWeight: '700', marginBottom: SIZING.spacing.xs },
  tierRewardHint: { fontSize: SIZING.font.small },
  levelBox: { borderWidth: 1, borderRadius: 8, paddingVertical: SIZING.spacing.md, paddingHorizontal: SIZING.spacing.lg, minWidth: 64, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  levelBoxLocked: { opacity: 0.5 },
  levelBoxCompleted: { opacity: 0.9 },
  levelLabel: { fontSize: SIZING.font.body, fontWeight: '600' },
  levelCost: { fontSize: SIZING.font.small, marginTop: SIZING.spacing.xs },
  levelBoxCantAfford: { opacity: 0.7 },
  levelOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  defeatedX: { fontSize: 24, fontWeight: '700' },
  errorText: { fontSize: SIZING.font.body, marginTop: SIZING.spacing.lg },
  rulesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SIZING.spacing.lg },
  rulesBox: { borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.lg, maxWidth: 420, width: '90%', maxHeight: '85%', minHeight: 200 },
  rulesScroll: { height: 420, alignSelf: 'stretch' },
  rulesScrollContent: { paddingRight: SIZING.spacing.sm, paddingBottom: SIZING.spacing.lg },
  rulesText: { fontSize: SIZING.font.small, lineHeight: 22 },
  rulesClose: { borderWidth: 1, borderRadius: 6, paddingVertical: SIZING.spacing.xs, paddingHorizontal: SIZING.spacing.md, alignSelf: 'flex-end', marginTop: SIZING.spacing.md },
  rulesCloseText: { fontSize: SIZING.font.small },
});
