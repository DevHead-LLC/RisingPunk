import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';
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
    <View style={styles.buildStatus}>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Type:</Text>
        <Text style={styles.statusValue}>{selectedType || 'N/A'}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Total Cost:</Text>
        <Text style={styles.statusValue}>
          {`$${formatBalance(calculateCost())}`}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  buildStatus: {
    backgroundColor: 'rgba(26, 77, 51, 0.1)',
    borderRadius: 4,
    padding: SIZING.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZING.spacing.xs,
  },
  statusLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
  },
  statusValue: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
});
