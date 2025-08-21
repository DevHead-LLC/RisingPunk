import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BotType } from '../../types/bots';
import { useAppSelector } from '../../store/hooks';

// Utility function for formatting balance
export function formatBalance(amount: number): string {
  if (amount === undefined || amount === null) {return '0';}
  return amount.toLocaleString();
}

type BuildStatusProps = {
  selectedType: BotType | null;
  quantity: string;
  botCost: number;
};

export const BuildStatus = React.memo(function BuildStatus({
  selectedType,
  quantity,
  botCost,
}: BuildStatusProps) {
  const buildQueue = useAppSelector((state) => state.bots.buildQueue);
  const colors = useThemeColors();

  const calculateCost = () => {
    // For active builds, use the stored totalCost
    if (buildQueue?.totalCost) {
      return buildQueue.totalCost;
    }
    // For new builds, calculate from inputs
    if (selectedType && quantity) {
      return botCost * (parseInt(quantity) || 0);
    }
    return 0;
  };

  return (
    <View style={[styles.buildStatus, { backgroundColor: colors.accent + '10' }]}>
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.text.placeholder }]}>Type:</Text>
        <Text style={[styles.statusValue, { color: colors.text.primary }]}>{selectedType || 'N/A'}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.text.placeholder }]}>Total Cost:</Text>
        <Text style={[styles.statusValue, { color: colors.text.primary }]}>
          {`$${formatBalance(calculateCost())}`}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  buildStatus: {
    borderRadius: 4,
    padding: SIZING.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZING.spacing.xs,
  },
  statusLabel: {
    fontSize: SIZING.font.small,
  },
  statusValue: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
});
