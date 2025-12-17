import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Balance } from '../components/common/Balance';
import { CloseButton } from '../components/common/CloseButton';
import { useAppSelector } from '../store/hooks';
import { SIZING } from '../styles/theme';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { BotType } from '../types/bots';
import { useFetchBotStatsQuery } from '../store/api/botsApi';
import { formatNumber } from '../utils/formatUtils';

type MarkLevel = 1 | 2 | 3 | 4;

export function DigitalBarracksScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const botCounts = useAppSelector((state) => state.bots.botCounts);
  const [selectedMark, setSelectedMark] = useState<MarkLevel>(1);
  const { data: botStatsData, isLoading: botStatsLoading } = useFetchBotStatsQuery();
  const colors = useThemeColors();
  const { themeMode } = useTheme();

  const styles = useMemo(() => createStyles(colors, themeMode), [colors, themeMode]);

  const BotCard = ({ type }: { type: BotType }) => {
    const hackerLore = {
      breacher: "IRL: Named after 'breach and clear' tactics used in early penetration testing, where security teams would methodically break through firewall layers.",
      guardian: "IRL: Inspired by 'packet guardian' programs from the 1990s that network administrators used to monitor and filter suspicious traffic.",
      phreak: "IRL: Based on 'phone phreakers' from the 1970s who used blue boxes to manipulate telephone systems and make free long-distance calls.",
    };

    const botStats = botStatsData?.botStats?.[type];
    const allBotStats = botStatsData?.botStats;

    const getBotRole = (_type: BotType): string => {
      return botStats?.role || 'Unknown';
    };

    const getTypeMatchups = (botType: BotType): { strongAgainst: string; weakAgainst: string } => {
      const matchups: Record<BotType, { strongAgainst: string; weakAgainst: string }> = {
        guardian: { strongAgainst: 'Breacher', weakAgainst: 'Phreak' },
        breacher: { strongAgainst: 'Phreak', weakAgainst: 'Guardian' },
        phreak: { strongAgainst: 'Guardian', weakAgainst: 'Breacher' },
      };
      return matchups[botType];
    };

    const matchups = getTypeMatchups(type);

    return (
      <View style={styles.botCard}>
        <View style={styles.botHeader}>
          <Text style={styles.botName}>{type.toUpperCase()}</Text>
          <Text style={styles.botRole}>{getBotRole(type)}</Text>
        </View>

        <View style={styles.botContent}>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Available:</Text>
            <Text style={styles.countValue}>{formatNumber(botCounts?.[type] || 0)}</Text>
            <View style={styles.deployedContainer}>
              <Text style={styles.countLabel}>Deployed: 0</Text>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.loreContainer}>
              <Text style={styles.hackerLore}>{hackerLore[type]}</Text>
              <Text style={styles.strongText}>Strong vs: {matchups.strongAgainst}</Text>
              <Text style={styles.weakText}>Weak vs: {matchups.weakAgainst}</Text>
            </View>

            <View style={styles.statsContainer}>
              {botStats?.stats ? Object.entries(botStats.stats).map(([stat, value]) => (
                <View key={stat} style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {stat === 'range' ? 'ATTACK DISTANCE' :
                     stat === 'offense' ? 'ATTACK POWER' :
                     stat === 'defense' ? 'DEFENSE ABILITY' :
                     stat.toUpperCase()}
                  </Text>
                  <Text style={styles.statValue}>
                    {stat === 'defense' ? `${Math.round(Number(value) * 100)}%` : String(value)}
                  </Text>
                </View>
              )) : (
                <Text style={styles.lockedText}>No stats available</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const ArmyComposition = () => {
    if (!botCounts) {return null;}

    const total = Object.values(botCounts).reduce((a, b) => a + b, 0);
    if (total === 0) {return null;}

    return (
      <View style={styles.compositionContainer}>
        <View style={styles.barContainer}>
          {Object.entries(botCounts).map(([type, count]) => {
            const percentage = (count / total) * 100;
            return (
              <View
                key={type}
                style={[
                  styles.compositionBar,
                  {
                    width: `${percentage}%`,
                    backgroundColor:
                      type === 'breacher' ? '#FF4B4B' :
                      type === 'guardian' ? '#4CAF50' :
                      '#2196F3',
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.compositionLegend}>
          {Object.entries(botCounts).map(([type, count]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[
                styles.legendDot,
                {
                  backgroundColor:
                    type === 'breacher' ? '#FF4B4B' :
                    type === 'guardian' ? '#4CAF50' :
                    '#2196F3',
                },
              ]} />
              <Text style={styles.legendText}>
                {`${type.charAt(0).toUpperCase() + type.slice(1)}: ${((count / total) * 100).toFixed(1)}%`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.header}>
        <Balance />
      </View>

      <Text style={styles.title}>Digital Barracks</Text>

      <View style={styles.markSelector}>
        {[1, 2, 3, 4].map((mark) => (
          <TouchableOpacity
            key={mark}
            style={[
              styles.markButton,
              selectedMark === mark && styles.selectedMark,
            ]}
            onPress={() => setSelectedMark(mark as MarkLevel)}
          >
            <Text style={styles.markText}>MARK {mark}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Army Size:</Text>
            <Text style={styles.totalCount}>
              {formatNumber(botCounts ? Object.values(botCounts).reduce((a, b) => a + b, 0) : 0)}
            </Text>
          </View>
          <ArmyComposition />
        </View>

        <View style={styles.botsContainer}>
          {selectedMark === 1 ? (
            botStatsLoading ? (
              <Text style={styles.lockedText}>Loading...</Text>
            ) : botStatsData?.botStats ? (
              Object.keys(botStatsData.botStats).map((type) => (
                <BotCard key={type} type={type as BotType} />
              ))
            ) : (
              <Text style={styles.lockedText}>No bot data available</Text>
            )
          ) : (
            <Text style={styles.lockedText}>🔒 MARK {selectedMark} UNITS LOCKED</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>, themeMode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  totalContainer: {
    backgroundColor: themeMode === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginHorizontal: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
    borderWidth: 1,
    borderColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.2)' : 'rgba(0, 255, 255, 0.1)',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  totalLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    marginRight: SIZING.spacing.sm,
  },
  totalCount: {
    color: colors.text.accent,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  markSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.3)' : 'rgba(0, 255, 65, 0.2)',
  },
  markButton: {
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.6)' : 'rgba(0, 255, 65, 0.4)',
    backgroundColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.1)' : 'rgba(26, 77, 51, 0.1)',
    minWidth: 70,
    alignItems: 'center',
  },
  selectedMark: {
    backgroundColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.2)' : 'rgba(26, 77, 51, 0.4)',
    borderColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.8)' : 'rgba(0, 255, 65, 0.8)',
  },
  markText: {
    color: colors.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  botsContainer: {
    padding: 20,
  },
  botCard: {
    backgroundColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.1)' : 'rgba(26, 77, 51, 0.3)',
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.md,
    borderWidth: 1,
    borderColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.3)' : 'rgba(0, 255, 65, 0.4)',
  },
  botHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  botName: {
    color: colors.secondary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  botRole: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
  },
  botContent: {
    gap: SIZING.spacing.xs,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.3)' : 'rgba(0, 255, 65, 0.2)',
    paddingBottom: SIZING.spacing.xs,
  },
  countLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    marginRight: SIZING.spacing.sm,
  },
  countValue: {
    color: colors.text.accent,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginRight: SIZING.spacing.lg,
  },
  deployedContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
  },
  loreContainer: {
    flex: 3,
  },
  lockedText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginVertical: SIZING.spacing.lg,
  },
  hackerLore: {
    color: colors.text.primary,
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: colors.secondary,
    paddingLeft: SIZING.spacing.xs,
    marginBottom: SIZING.spacing.lg,
  },
  strongText: {
    color: themeMode === 'light' ? '#006400' : '#00ff41',
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginTop: SIZING.spacing.xs,
  },
  weakText: {
    color: themeMode === 'light' ? '#8B0000' : '#ff6b6b',
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginTop: SIZING.spacing.xs,
  },
  statsContainer: {
    flex: 2,
    gap: SIZING.spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    flex: 1,
  },
  statValue: {
    color: colors.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginLeft: SIZING.spacing.sm,
  },
  compositionContainer: {
    marginTop: SIZING.spacing.sm,
  },
  barContainer: {
    height: 6,
    backgroundColor: themeMode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: SIZING.spacing.xs,
  },
  compositionBar: {
    height: '100%',
  },
  compositionLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZING.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SIZING.spacing.xs,
  },
  legendText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
  },
});
