import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppDispatch } from '../../store/hooks';
import { setFinancialStatements } from '../../store/slices/uiSlice';
import { roundToFloor } from '../../utils/currencyUtils';

// Utility function for formatting balance
export function formatBalance(amount: number): string {
  if (amount === undefined || amount === null) {return '0';}
  const roundedAmount = roundToFloor(amount);
  return roundedAmount.toLocaleString();
}

export const Balance = memo(() => {
  const colors = useThemeColors();
  const balance = useAppSelector(getCurrentBalance);
  const dispatch = useAppDispatch();
  const [, setUpdateTrigger] = useState(0);

  // Force re-render every 10 seconds to update balance display
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [balance]);

  return (
    <TouchableOpacity style={[styles.balanceContainer, { backgroundColor: colors.accent, borderColor: colors.primary }]} onPress={() => dispatch(setFinancialStatements(true))} activeOpacity={0.8}>
      <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>WALLET:</Text>
      <Text style={[styles.balanceAmount, { color: colors.matrix }]}>${formatBalance(balance)}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  balanceContainer: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    left: SIZING.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    maxWidth: 180,
    zIndex: 9999,
  },
  balanceLabel: {
    marginRight: SIZING.spacing.xs,
    fontSize: SIZING.font.small,
  },
  balanceAmount: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
});
