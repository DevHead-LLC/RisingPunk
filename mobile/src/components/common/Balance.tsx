import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { formatBalance } from '../../context/BalanceContext';
import { SIZING, COLORS } from '../../styles/theme';

export const Balance = memo(() => {
  const balance = useAppSelector(getCurrentBalance);

  return (
    <View style={styles.balanceContainer}>
      <Text style={styles.balanceLabel}>WALLET:</Text>
      <Text style={styles.balanceAmount}>${formatBalance(balance)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  balanceContainer: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    left: SIZING.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    padding: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    maxWidth: 180,
    zIndex: 9999,
  },
  balanceLabel: {
    color: COLORS.text.secondary,
    marginRight: SIZING.spacing.xs,
    fontSize: SIZING.font.small,
  },
  balanceAmount: {
    color: COLORS.matrix,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
}); 