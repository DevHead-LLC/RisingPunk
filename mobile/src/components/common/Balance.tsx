import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppDispatch } from '../../store/hooks';
import { setFinancialStatements } from '../../store/slices/uiSlice';
import { roundToFloor } from '../../utils/currencyUtils';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';

// Utility function for formatting balance
export function formatBalance(amount: number): string {
  if (amount === undefined || amount === null) {return '0';}
  const roundedAmount = roundToFloor(amount);
  return roundedAmount.toLocaleString();
}

type BalanceProps = {
  isIntroActive?: boolean;
};

export const Balance = memo(({ isIntroActive = false }: BalanceProps) => {
  const colors = useThemeColors();
  const balance = useAppSelector(getCurrentBalance);
  const dispatch = useAppDispatch();
  const { highlightTaskId } = useTaskGuideHighlight();
  const [, setUpdateTrigger] = useState(0);
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  const isVisitHome = highlightTaskId === 'visit-home';

  // Force re-render every 10 seconds to update balance display
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [balance]);
  
  useEffect(() => {
    if (isIntroActive) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % introColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isIntroActive, introColors.length]);
  
  useEffect(() => {
    if (isIntroActive) {
      Animated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isIntroActive, animatedBorderColor]);
  
  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: introColors,
  });

  return (
    <Animated.View style={[
      styles.balanceContainer, 
      { 
        backgroundColor: colors.accent, 
        borderColor: isIntroActive ? animatedBorderColorValue : colors.primary,
        borderWidth: isIntroActive ? 3 : 1,
        zIndex: isVisitHome ? 3 : 9999
      }
    ]}>
      <TouchableOpacity 
        style={styles.balanceContent}
        onPress={() => dispatch(setFinancialStatements(true))} 
        activeOpacity={0.8}
      >
        <Text style={[styles.balanceLabel, { color: colors.text.secondary }]}>WALLET:</Text>
        <Text style={[styles.balanceAmount, { color: colors.matrix }]}>${formatBalance(balance)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  balanceContainer: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    left: SIZING.spacing.lg,
    padding: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    maxWidth: 180,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
