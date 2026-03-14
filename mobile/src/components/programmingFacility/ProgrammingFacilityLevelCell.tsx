import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCost } from '../../utils/programmingFacilityTierConfig';

/** Minimal level config shape used by Packet Breach, Race Condition Heist, and Binary Bank Crack level screens. */
export interface ProgrammingFacilityLevelConfigForCell {
  levelId: string;
  cost?: number;
  isUnlocked: boolean;
  isCompleted: boolean;
}

type Props = {
  config: ProgrammingFacilityLevelConfigForCell;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
  canAfford: boolean;
  isSessionStarting: boolean;
  isThisLevelStarting: boolean;
  /** Optional suffix after cost in accessibility label (e.g. " per attempt" for Packet Breach). */
  costLabelSuffix?: string;
};

export function ProgrammingFacilityLevelCell({
  config,
  colors,
  onPress,
  canAfford,
  isSessionStarting,
  isThisLevelStarting,
  costLabelSuffix = '',
}: Props) {
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
  const accessibilityLabel =
    isThisLevelStarting
      ? `Level ${config.levelId}, starting...`
      : canAfford
        ? `Level ${config.levelId}, ${costLabel}${costLabelSuffix}. Tap to play.`
        : `Level ${config.levelId}, ${costLabel}${costLabelSuffix}. Insufficient funds.`;

  if (config.isUnlocked && !config.isCompleted) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!canAfford || isSessionStarting}
        accessible
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
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
  levelBoxLocked: { opacity: 0.5 },
  levelBoxCompleted: { opacity: 0.9 },
  levelLabel: { fontSize: SIZING.font.body, fontWeight: '600' },
  levelCost: { fontSize: SIZING.font.small, marginTop: SIZING.spacing.xs },
  levelBoxCantAfford: { opacity: 0.7 },
  levelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defeatedX: { fontSize: 24, fontWeight: '700' },
});
