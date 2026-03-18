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
  useGetBinaryBankCrackStatusQuery,
  useStartBinaryBankCrackSessionMutation,
  type BinaryBankCrackLevelConfig,
  type BinaryBankCrackSessionResponse,
} from '../store/api/binaryBankCrackApi';
import { balanceApi } from '../store/api/balanceApi';
import { TIER_CONFIGS } from '../utils/programmingFacilityTierConfig';
import { ProgrammingFacilityLevelCell } from '../components/programmingFacility/ProgrammingFacilityLevelCell';
import { useProgrammingFacilityLevelScreen } from '../hooks/useProgrammingFacilityLevelScreen';

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
Complete all five levels in a tier to unlock that tier's stat bonus for the Remote bot type (Phreaks): Attack, Health, Defense, Speed — same cycle as Brute (Packet Breach) and Sprint (Race Condition Heist).`;

type BinaryBankCrackLevelScreenProps = {
  onClose: () => void;
  onSelectLevel: (levelId: string, session?: BinaryBankCrackSessionResponse) => void;
};

const ENTRY_DEDUCTION_DELAY_MS = 1000;

export function BinaryBankCrackLevelScreen({ onClose, onSelectLevel }: BinaryBankCrackLevelScreenProps) {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const [showRules, setShowRules] = useState(false);
  const balance = useAppSelector(getCurrentBalance);
  const { data: status, isLoading, error } = useGetBinaryBankCrackStatusQuery(undefined, {
    pollingInterval: 60000,
  });
  const [startSessionMutation] = useStartBinaryBankCrackSessionMutation();

  useEffect(() => {
    dispatch(balanceApi.util.invalidateTags(['Balance']));
  }, [dispatch]);

  const levelConfigs = status?.levelConfigs ?? [];
  const numericBalance = typeof balance === 'number' ? balance : 0;

  const { startingLevelId, handleClose, handleSelectLevel } = useProgrammingFacilityLevelScreen<BinaryBankCrackSessionResponse>({
    levelConfigs,
    numericBalance,
    startSession: (levelId) => startSessionMutation(levelId).unwrap(),
    onSelectLevel,
    onClose,
    entryDeductionDelayMs: ENTRY_DEDUCTION_DELAY_MS,
  });

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
      <Text style={[styles.title, { color: colors.primary }]}>Program Remote for Tiered Rewards</Text>
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
          {TIER_CONFIGS.map(({ tier, rewardLabel, levelRange }) => {
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
                    {rewardLabel}
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
                    {isTierAchieved ? '✓ Unlocked' : `Complete ${levelRange} to unlock`}
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
  errorText: { fontSize: SIZING.font.body, marginTop: SIZING.spacing.lg },
  rulesOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SIZING.spacing.lg },
  rulesBox: { borderWidth: 1, borderRadius: 8, padding: SIZING.spacing.lg, maxWidth: 420, width: '90%', maxHeight: '85%', minHeight: 200 },
  rulesScroll: { height: 420, alignSelf: 'stretch' },
  rulesScrollContent: { paddingRight: SIZING.spacing.sm, paddingBottom: SIZING.spacing.lg },
  rulesText: { fontSize: SIZING.font.small, lineHeight: 22 },
  rulesClose: { borderWidth: 1, borderRadius: 6, paddingVertical: SIZING.spacing.xs, paddingHorizontal: SIZING.spacing.md, alignSelf: 'flex-end', marginTop: SIZING.spacing.md },
  rulesCloseText: { fontSize: SIZING.font.small },
});
