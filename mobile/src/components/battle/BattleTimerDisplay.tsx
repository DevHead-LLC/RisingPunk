import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

type Props = {
  battleTime: number;
  maxBattleTime: number;
  isVisible: boolean;
};

export const BattleTimerDisplay = React.memo(({ battleTime, maxBattleTime, isVisible }: Props) => {
  const colors = useThemeColors();
  
  if (!isVisible) return null;

  // Keep replay/live timer display aligned with regular battles: show whole seconds only.
  const wholeSecondsRemaining = Math.max(0, Math.ceil(Number.isFinite(battleTime) ? battleTime : 0));
  const safeMaxBattleTime = Number.isFinite(maxBattleTime) ? Math.max(0, maxBattleTime) : 0;

  const safeBattleTime = Number.isFinite(battleTime) ? Math.max(0, battleTime) : 0;

  // battleTime now represents time remaining (45s down to 0s)
  // Keep bar motion smooth by using finite raw seconds while the label remains whole seconds.
  const widthPct =
    safeMaxBattleTime > 0
      ? Math.min(100, (safeBattleTime / safeMaxBattleTime) * 100)
      : 0;
  const progressFillStyle = [
    styles.progressFill,
    { width: `${widthPct}%` as any, backgroundColor: colors.secondary },
  ];
  const timerText = `${wholeSecondsRemaining}s`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.statusText, { color: colors.secondary }]}>SYSTEM BREACH IN PROGRESS</Text>
        <Text style={[styles.timerText, { color: colors.text.primary }]}>{timerText}</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.progressBarBg }]}>
        <View style={progressFillStyle} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    padding: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
