import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { useFetchBotStatsQuery, useFetchBotStatsBreakdownQuery, type StatRow } from '../store/api/botsApi';
import { useTrackDigitalBarracksVisitMutation as useTrackDigitalBarracksVisitMutationFromUserGuide } from '../store/api/userGuideApi';
import { useTaskGuideHighlight } from '../contexts/TaskGuideHighlightContext';
import { formatBotStatValue, formatNumber } from '../utils/formatUtils';
import { BOT_FAMILY_ORDER, MARK2_DISPLAY_NAMES } from '../utils/botInventory';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';
import { HackExpeditionCommitmentBanner } from '../components/common/HackExpeditionCommitmentBanner';

type MarkLevel = 1 | 2 | 3 | 4;

/** Bot display names and type labels (Sprint/Brute/Remote) for Digital Barracks. */
const BOT_DISPLAY_NAMES: Record<BotType, string> = {
  guardian: 'Guardian',
  breacher: 'Breacher',
  phreak: 'Phreak',
};
const BOT_TYPE_LABELS: Record<BotType, string> = {
  guardian: 'Sprint',
  breacher: 'Brute',
  phreak: 'Remote',
};

/** Mark I composition bar / legend (per family). */
const M1_COMPOSITION_COLORS: Record<BotType, string> = {
  breacher: '#FF4B4B',
  guardian: '#4CAF50',
  phreak: '#2196F3',
};
/** Mark II: distinct palette so M1 vs M2 reads at a glance. */
const M2_COMPOSITION_COLORS: Record<BotType, string> = {
  breacher: '#FF9800',
  guardian: '#26C6DA',
  phreak: '#AB47BC',
};

const BREAKDOWN_STAT_KEYS: (keyof StatRow)[] = ['health', 'offense', 'defense', 'speed', 'range'];

function statColumnLabel(stat: keyof StatRow): string {
  if (stat === 'range') return 'ATTACK DISTANCE';
  if (stat === 'offense') return 'ATTACK POWER';
  if (stat === 'defense') return 'DEFENSE ABILITY';
  return stat.toUpperCase();
}

/** RPS by type: Sprint > Brute > Remote > Sprint (shown as labels, not unit names). */
const TYPE_MATCHUPS: Record<BotType, { strongAgainst: string; weakAgainst: string }> = {
  guardian: { strongAgainst: 'Brute', weakAgainst: 'Remote' },
  breacher: { strongAgainst: 'Remote', weakAgainst: 'Sprint' },
  phreak: { strongAgainst: 'Sprint', weakAgainst: 'Brute' },
};

/** Short “In Real Life” blurbs: what the unit name refers to in hacker / cyberpunk culture. */
const UNIT_IN_REAL_LIFE: Record<1 | 2, Record<BotType, string>> = {
  1: {
    breacher:
      'In Real Life: “Breacher” echoes military breach-and-clear and red-team pentesters, operators who force a path through walls and firewalls to prove where defenses break.',
    guardian:
      'In Real Life: “Guardian” suggests perimeter defense: admins and tools that watch packets, filter traffic, and stand between your network and everyone else (classic “ICE” energy).',
    phreak:
      'In Real Life: “Phreak” comes from phone phreaks: 1970s hackers who played the phone system with boxes and tones; in fiction, the trickster who social-engineers the machine.',
  },
  2: {
    breacher:
      'In Real Life: “Exploit” is straight from infosec: weaponized code or a technique that abuses a bug to gain control. Every cyberpunk run hinges on a good exploit.',
    guardian:
      'In Real Life: “Worm” means self-copying malware that crawls net to net. Think Morris Worm lore and stories where one loose program infects the whole grid.',
    phreak:
      'In Real Life: “Sniffer” is a passive tap on the wire: packet capture and eavesdropping (Wireshark-era tradecraft) from the shadows of the LAN.',
  },
};

export function DigitalBarracksScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const token = useAppSelector((state) => state.auth.token);
  const botCounts = useAppSelector((state) => state.bots.botCounts);
  const botCountsM2 = useAppSelector((state) => state.bots.botCountsM2);
  const [selectedMark, setSelectedMark] = useState<MarkLevel>(1);
  const { data: botStatsData, isLoading: botStatsLoading } = useFetchBotStatsQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });
  /** Same `total` row as Profile > Stats (Mark I); avoids stale `/stats` cache missing programming bonuses. */
  const { data: breakdownData, isLoading: breakdownLoading } = useFetchBotStatsBreakdownQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability', { skip: !token });
  const mark2ResearchUnlocked =
    hackAbilityFeatures?.features?.some((f: { id?: string; isUnlocked?: boolean }) => f.id === 'mark-2-bots' && f.isUnlocked) ??
    false;
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const [trackDigitalBarracksVisit] = useTrackDigitalBarracksVisitMutationFromUserGuide();
  const { highlightTaskId, clearHighlight } = useTaskGuideHighlight();
  const hasTrackedVisit = useRef(false);

  const styles = useMemo(() => createStyles(colors, themeMode), [colors, themeMode]);

  useEffect(() => {
    if (token && !hasTrackedVisit.current) {
      hasTrackedVisit.current = true;
      trackDigitalBarracksVisit().then(() => {
        if (highlightTaskId === 'visit-digital-barracks') {
          clearHighlight();
        }
      }).catch(() => {
        if (highlightTaskId === 'visit-digital-barracks') {
          clearHighlight();
        }
      });
    }
  }, [token, highlightTaskId, trackDigitalBarracksVisit, clearHighlight]);

  const BotCard = ({ type, markLevel }: { type: BotType; markLevel: 1 | 2 }) => {
    const displayName = markLevel === 2 ? MARK2_DISPLAY_NAMES[type] : BOT_DISPLAY_NAMES[type];
    const inventory = markLevel === 2 ? botCountsM2 : botCounts;
    const totalFromBreakdown = breakdownData?.breakdown?.[type]?.total;
    const m2TotalFromBreakdown = breakdownData?.breakdown?.[type]?.mark2?.total;
    const botStats =
      markLevel === 2
        ? m2TotalFromBreakdown != null
          ? { role: '', stats: m2TotalFromBreakdown }
          : botStatsData?.botStatsM2?.[type]
        : totalFromBreakdown != null
          ? { role: '', stats: totalFromBreakdown }
          : botStatsData?.botStats?.[type];

    const matchups = TYPE_MATCHUPS[type];
    const breakdownForType = breakdownData?.breakdown?.[type];

    return (
      <View style={styles.botCard}>
        <View style={styles.botHeader}>
          <Text style={styles.botName}>{displayName}</Text>
          <Text style={styles.botRole}>{BOT_TYPE_LABELS[type]}</Text>
        </View>

        <View style={styles.botContent}>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Available:</Text>
            <Text style={styles.countValue}>{formatNumber(inventory?.[type] ?? 0)}</Text>
            <View style={styles.deployedContainer}>
              <Text style={styles.countLabel}>Deployed: 0</Text>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.loreContainer}>
              <Text style={styles.hackerLore}>{UNIT_IN_REAL_LIFE[markLevel][type]}</Text>
              {matchups ? (
                <>
                  <Text style={styles.strongText}>Strong vs: {matchups.strongAgainst}</Text>
                  <Text style={styles.weakText}>Weak vs: {matchups.weakAgainst}</Text>
                </>
              ) : (
                <Text style={styles.lockedText}>Matchup data not available</Text>
              )}
            </View>

            <View style={styles.statsContainer}>
              {botStats?.stats ? Object.entries(botStats.stats).map(([stat, value]) => (
                <View key={stat} style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {statColumnLabel(stat as keyof StatRow)}
                  </Text>
                  <Text style={styles.statValue}>
                    {formatBotStatValue(stat, Number(value))}
                  </Text>
                </View>
              )) : (
                <Text style={styles.lockedText}>No stats available</Text>
              )}
              {breakdownForType ? (
                <>
                  <View style={styles.crewBonusDivider} />
                  <Text style={styles.crewBonusNote}>Army-wide crew bonuses (included in totals above)</Text>
                  <Text style={styles.crewBonusHeading}>Crew Research</Text>
                  {BREAKDOWN_STAT_KEYS.map((stat) => (
                    <View key={`crew-r-${String(stat)}`} style={styles.statRow}>
                      <Text style={styles.statLabel}>{statColumnLabel(stat)}</Text>
                      <Text style={styles.statValue}>
                        {formatBotStatValue(stat, breakdownForType.crewResearchBonus[stat])}
                      </Text>
                    </View>
                  ))}
                  <Text style={styles.crewBonusHeading}>Crew Benefits</Text>
                  {BREAKDOWN_STAT_KEYS.map((stat) => (
                    <View key={`crew-l-${String(stat)}`} style={styles.statRow}>
                      <Text style={styles.statLabel}>{statColumnLabel(stat)}</Text>
                      <Text style={styles.statValue}>
                        {formatBotStatValue(stat, breakdownForType.crewLevelBonus[stat])}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const ArmyComposition = () => {
    if (!botCounts || !botCountsM2) {return null;}

    const total =
      BOT_FAMILY_ORDER.reduce((sum, type) => sum + (botCounts[type] ?? 0) + (botCountsM2[type] ?? 0), 0);
    if (total === 0) {return null;}

    const segments = BOT_FAMILY_ORDER.flatMap((type) => [
      {
        key: `m1-${type}`,
        count: botCounts[type] ?? 0,
        color: M1_COMPOSITION_COLORS[type],
        label: `${BOT_DISPLAY_NAMES[type]} (M I)`,
      },
      {
        key: `m2-${type}`,
        count: botCountsM2[type] ?? 0,
        color: M2_COMPOSITION_COLORS[type],
        label: `${MARK2_DISPLAY_NAMES[type]} (M II)`,
      },
    ]);

    return (
      <View style={styles.compositionContainer}>
        <View style={styles.barContainer}>
          {segments.map((seg) => {
            const percentage = (seg.count / total) * 100;
            if (percentage <= 0) {return null;}
            return (
              <View
                key={seg.key}
                style={[
                  styles.compositionBar,
                  {
                    width: `${percentage}%`,
                    backgroundColor: seg.color,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={[styles.compositionLegend, styles.compositionLegendWrap]}>
          {segments
            .filter((seg) => seg.count > 0)
            .map((seg) => {
              const pct = (seg.count / total) * 100;
              return (
                <View key={`leg-${seg.key}`} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: seg.color },
                    ]}
                  />
                  <Text style={styles.legendText}>
                    {`${seg.label}: ${pct.toFixed(1)}%`}
                  </Text>
                </View>
              );
            })}
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

      <HackExpeditionCommitmentBanner />

      <View style={styles.markSelector}>
        {[1, 2, 3, 4].map((mark) => {
          const isMark2Locked = mark === 2 && !mark2ResearchUnlocked;
          const isFutureMark = mark === 3 || mark === 4;
          // Bugbot: flagged locked tabs as tappable without disabled. Intended — tapping a
          // locked Mark tab shows the locked-state screen (research prompt / coming soon).
          return (
            <TouchableOpacity
              key={mark}
              style={[
                styles.markButton,
                selectedMark === mark && styles.selectedMark,
                (isMark2Locked || isFutureMark) && styles.markButtonLocked,
              ]}
              onPress={() => setSelectedMark(mark as MarkLevel)}
            >
              <Text style={styles.markText}>MARK {mark}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Army Size:</Text>
            <Text style={styles.totalCount}>
              {formatNumber(
                botCounts && botCountsM2
                  ? BOT_FAMILY_ORDER.reduce(
                      (sum, type) =>
                        sum + (botCounts[type] ?? 0) + (botCountsM2[type] ?? 0),
                      0
                    )
                  : 0
              )}
            </Text>
          </View>
          <ArmyComposition />
        </View>

        <View style={styles.botsContainer}>
          {selectedMark === 1 ? (
            (breakdownLoading && !breakdownData?.breakdown) || (botStatsLoading && !botStatsData?.botStats) ? (
              <Text style={styles.lockedText}>Loading...</Text>
            ) : botStatsData?.botStats || breakdownData?.breakdown ? (
              BOT_FAMILY_ORDER.map((type) => <BotCard key={`m1-${type}`} type={type} markLevel={1} />)
            ) : (
              <Text style={styles.lockedText}>No bot data available</Text>
            )
          ) : selectedMark === 2 ? (
            !mark2ResearchUnlocked ? (
              <Text style={styles.lockedText}>🔒 MARK 2 UNITS LOCKED. Complete Mark II Bots research in Hack Ability.</Text>
            ) : (breakdownLoading && !breakdownData?.breakdown) ||
              (botStatsLoading &&
                !botStatsData?.botStatsM2 &&
                !breakdownData?.breakdown?.breacher?.mark2) ? (
              <Text style={styles.lockedText}>Loading...</Text>
            ) : (
              BOT_FAMILY_ORDER.map((type) => <BotCard key={`m2-${type}`} type={type} markLevel={2} />)
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
  markButtonLocked: {
    opacity: 0.55,
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
  crewBonusDivider: {
    marginTop: SIZING.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.25)' : 'rgba(0, 255, 65, 0.25)',
    paddingTop: SIZING.spacing.sm,
  },
  crewBonusNote: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
    marginBottom: SIZING.spacing.xs,
  },
  crewBonusHeading: {
    color: colors.secondary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginTop: SIZING.spacing.xs,
    marginBottom: 2,
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
  compositionLegendWrap: {
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
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
