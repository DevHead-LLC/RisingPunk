import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { SIZING } from '../styles/theme';
import {
  BUG_HUNT_ROSTER_ID_KAITO,
  KAITO_GLITCH_HEADSHOT_IMAGE,
  KAITO_GLITCH_SPRINT_IMAGE,
} from '../constants/hackMapBugHuntVisuals';
import {
  useFetchHunterStatsQuery,
  useFetchMyHuntersQuery,
  useUnlockHunterMutation,
} from '../store/api/bugHuntApi';

type Props = {
  onClose: () => void;
};

type HunterCard = {
  rosterId: typeof BUG_HUNT_ROSTER_ID_KAITO;
  name: string;
  typeLabel: string;
  listImage: number;
  detailImage: number;
  baseStats: {
    health: number;
    offense: number;
    defense: number;
    speed: number;
    range: number;
  };
  backstory: string;
  hackBoost: {
    name: string;
    summary: string;
    effects: string[];
  };
};

const KAITO_CARD: HunterCard = {
  rosterId: BUG_HUNT_ROSTER_ID_KAITO,
  name: 'Kaito Glitch',
  typeLabel: 'SPRINT',
  listImage: KAITO_GLITCH_HEADSHOT_IMAGE,
  detailImage: KAITO_GLITCH_SPRINT_IMAGE,
  baseStats: {
    health: 115000,
    offense: 20000,
    defense: 6,
    speed: 9,
    range: 4,
  },
  backstory:
    'Kaito grew up in the dead zones between mirrored towers, where old telecom lines still whispered in static. ' +
    'Before he ever touched a formal training rig, he learned to read movement by watching patrol routes and power-cycle rhythms.\n\n' +
    'His handle, "Glitch", came from a raid where he ghosted through a closed sector by timing every sprint to blind spots in the security feed. ' +
    'He fights fast, changes angles constantly, and closes distance before enemies finish their first response pattern.\n\n' +
    'In bug hunts, Kaito is the first responder you trust when pressure spikes. ' +
    'He does not win fights by standing still - he wins by turning every second into momentum.',
  hackBoost: {
    name: 'Zero-Day Edge',
    summary: 'Battle-start Sprint protocol that sharpens every Sprint unit in the lineup.',
    effects: ['Sprint attack +5% (ATK x1.05)', 'Sprint speed +1 (whole stat point)'],
  },
};

export const HunterFacilityScreen: React.FC<Props> = ({ onClose }) => {
  const colors = useThemeColors();
  const { data: huntersData, isLoading: huntersLoading, refetch: refetchHunters } = useFetchMyHuntersQuery();
  const [unlockHunter, { isLoading: isUnlocking }] = useUnlockHunterMutation();
  const [selectedRosterId, setSelectedRosterId] = useState<typeof BUG_HUNT_ROSTER_ID_KAITO | null>(null);
  const hasKaito = (huntersData?.hunters ?? []).some((h) => h.hunterRosterId === BUG_HUNT_ROSTER_ID_KAITO);
  const { data: kaitoStatsData, isLoading: statsLoading, refetch: refetchStats } = useFetchHunterStatsQuery(
    BUG_HUNT_ROSTER_ID_KAITO,
    { skip: !hasKaito }
  );

  const selectedHunter = selectedRosterId === BUG_HUNT_ROSTER_ID_KAITO ? KAITO_CARD : null;
  const detailStats = useMemo(() => {
    if (!selectedHunter) {
      return null;
    }
    if (hasKaito && kaitoStatsData?.stats.current) {
      return {
        current: kaitoStatsData.stats.current,
        next: kaitoStatsData.stats.next,
      };
    }
    return {
      current: {
        health: selectedHunter.baseStats.health,
        offense: selectedHunter.baseStats.offense,
        defense: selectedHunter.baseStats.defense,
        speed: selectedHunter.baseStats.speed,
        range: selectedHunter.baseStats.range,
      },
      next: null as null,
    };
  }, [selectedHunter, hasKaito, kaitoStatsData]);

  const handleUnlockKaito = useCallback(async () => {
    const safeRefreshAfterUnlock = async () => {
      await refetchHunters();
      // Stats query is initially skipped until ownership appears in cache.
      // Don't treat "query not started yet" as an unlock failure.
      try {
        await refetchStats();
      } catch {
        // no-op: once hunters query reflects ownership, stats query will auto-start
      }
    };

    try {
      await unlockHunter({ hunterRosterId: BUG_HUNT_ROSTER_ID_KAITO }).unwrap();
      await safeRefreshAfterUnlock();
    } catch (error: unknown) {
      const payload =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: unknown; gateErrors?: unknown } }).data
          : undefined;
      const errorMessage = payload && typeof payload.error === 'string' ? payload.error : '';
      if (errorMessage === 'Hunter already unlocked') {
        await safeRefreshAfterUnlock();
        return;
      }
      const gateErrors = Array.isArray(payload?.gateErrors)
        ? payload?.gateErrors.filter((entry): entry is string => typeof entry === 'string')
        : [];
      if (gateErrors.length > 0) {
        Alert.alert('Unlock requirements not met', gateErrors.join('\n'));
        return;
      }
      const fallbackMessage =
        errorMessage.length > 0
          ? errorMessage
          : 'Unable to unlock Kaito right now.';
      Alert.alert('Unlock failed', fallbackMessage);
    }
  }, [unlockHunter, refetchHunters, refetchStats]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.patternLayer} pointerEvents="none">
          <View style={[styles.patternBeam, styles.patternBeamOne, { backgroundColor: `${colors.matrix}1E` }]} />
          <View style={[styles.patternBeam, styles.patternBeamTwo, { backgroundColor: `${colors.secondary}1A` }]} />
          <View style={[styles.patternBeam, styles.patternBeamThree, { backgroundColor: `${colors.text.secondary}18` }]} />
          <View style={[styles.patternDot, styles.patternDotOne, { borderColor: `${colors.matrix}40` }]} />
          <View style={[styles.patternDot, styles.patternDotTwo, { borderColor: `${colors.secondary}40` }]} />
        </View>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {selectedHunter ? (
              <TouchableOpacity
                style={[styles.backButton, { borderColor: colors.matrix }]}
                onPress={() => setSelectedRosterId(null)}
              >
                <Text style={[styles.backButtonText, { color: colors.secondary }]}>Back</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.title, { color: colors.secondary }]}>Hunter Facility</Text>
            )}
          </View>
          {selectedHunter && (
            <View style={styles.headerCenter} pointerEvents="none">
              <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
                {selectedHunter.name}
              </Text>
            </View>
          )}
          <View style={styles.closeButtonWrap}>
            <CloseButton onPress={onClose} />
          </View>
        </View>

        {!selectedHunter ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Choose a hunter to view details and manage unlocks.
            </Text>
            <View style={styles.hunterGrid}>
              <TouchableOpacity
                style={[styles.hunterCard, { borderColor: colors.matrix, backgroundColor: `${colors.background}D9` }]}
                activeOpacity={0.92}
                onPress={() => setSelectedRosterId(BUG_HUNT_ROSTER_ID_KAITO)}
              >
                <Image source={KAITO_CARD.listImage} style={styles.hunterCardImage} resizeMode="contain" />
                <View style={styles.hunterCardMeta}>
                  <Text style={[styles.hunterCardTitle, { color: colors.text.primary }]} numberOfLines={1}>
                    {KAITO_CARD.name}
                  </Text>
                  <Text style={[styles.hunterCardType, { color: colors.secondary }]}>{KAITO_CARD.typeLabel}</Text>
                  <Text style={[styles.hunterCardHint, { color: colors.text.secondary }]}>Tap to open dossier</Text>
                </View>
                {!hasKaito && (
                  <View style={[styles.lockBadge, { borderColor: colors.matrix, backgroundColor: `${colors.background}E6` }]}>
                    <Text style={[styles.lockBadgeText, { color: colors.secondary }]}>LOCKED</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            {huntersLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.matrix} />
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.detailContainer}>
            <View style={[styles.detailPanel, { borderColor: colors.matrix, backgroundColor: `${colors.background}D9` }]}>
              <View style={styles.detailBody}>
                <View style={[styles.detailImagePane, { borderColor: `${colors.matrix}60` }]}>
                  <Image source={selectedHunter.detailImage} style={styles.detailImage} resizeMode="contain" />
                <Text style={[styles.imageTypeChip, { color: colors.background, backgroundColor: colors.matrix }]}>
                  {selectedHunter.typeLabel}
                </Text>
                </View>

                <View style={styles.detailRightColumn}>
                  <View style={[styles.statsCard, { borderColor: colors.matrix, backgroundColor: `${colors.background}C7` }]}>
                    <View style={styles.statsHeaderRow}>
                      <Text style={[styles.statsCardTitle, { color: colors.text.primary }]}>Combat Profile</Text>
                      {hasKaito && (
                        <Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={1}>
                          Level {kaitoStatsData?.hunter.level} | XP {kaitoStatsData?.hunter.currentExp}/
                          {kaitoStatsData?.hunter.nextLevelExp}
                        </Text>
                      )}
                    </View>
                    {statsLoading || !detailStats ? (
                      <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.matrix} />
                      </View>
                    ) : (
                    <View style={styles.statsColumns}>
                      <View style={styles.statsColumn}>
                        {[
                          { label: 'Health', value: detailStats.current.health },
                          { label: 'Offense', value: detailStats.current.offense },
                          { label: 'Defense', value: detailStats.current.defense },
                        ].map((row) => (
                          <View key={row.label} style={styles.statRow}>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{row.label}</Text>
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>{row.value}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.statsColumn}>
                        {[
                          { label: 'Speed', value: detailStats.current.speed },
                          { label: 'Range', value: detailStats.current.range },
                        ].map((row) => (
                          <View key={row.label} style={styles.statRow}>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>{row.label}</Text>
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>{row.value}</Text>
                          </View>
                        ))}
                      </View>
                      </View>
                    )}
                  </View>

                  <View style={[styles.backstoryCard, { borderColor: colors.matrix, backgroundColor: `${colors.background}C7` }]}>
                    <Text style={[styles.backstoryTitle, { color: colors.text.primary }]}>Backstory and Boost</Text>
                    <ScrollView style={styles.backstoryScroll} contentContainerStyle={styles.backstoryScrollContent}>
                      <Text style={[styles.backstoryBoostName, { color: colors.text.primary }]}>{selectedHunter.hackBoost.name}</Text>
                      <Text style={[styles.hackBoostSummary, { color: colors.text.secondary }]}>
                        {selectedHunter.hackBoost.summary}
                      </Text>
                      {selectedHunter.hackBoost.effects.map((effect) => (
                        <Text key={effect} style={[styles.hackBoostEffect, { color: colors.text.primary }]}>
                          - {effect}
                        </Text>
                      ))}
                      <Text style={[styles.backstoryDivider, { color: colors.text.secondary }]}>---</Text>
                      <Text style={[styles.backstoryText, { color: colors.text.primary }]}>{selectedHunter.backstory}</Text>
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>

            {!hasKaito && (
              <View style={[styles.unlockFooter, { borderTopColor: `${colors.matrix}45` }]}>
                <TouchableOpacity
                  style={[
                    styles.unlockButton,
                    {
                      backgroundColor: colors.matrix,
                      opacity: isUnlocking ? 0.65 : 1,
                    },
                  ]}
                  disabled={isUnlocking}
                  onPress={handleUnlockKaito}
                >
                  <Text style={[styles.unlockButtonText, { color: colors.background }]}>
                    {isUnlocking ? 'Unlocking...' : 'Unlock Kaito Glitch'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.subtle, { color: colors.text.secondary }]}>
                  Requires level 5 + Research Center + Investment Property 1 + Antivirus Research + $250,000.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  patternLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternBeam: {
    position: 'absolute',
    height: 2,
    width: '170%',
  },
  patternBeamOne: {
    top: '20%',
    left: '-25%',
    transform: [{ rotate: '14deg' }],
  },
  patternBeamTwo: {
    top: '47%',
    left: '-40%',
    transform: [{ rotate: '-16deg' }],
  },
  patternBeamThree: {
    top: '74%',
    left: '-30%',
    transform: [{ rotate: '8deg' }],
  },
  patternDot: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
  },
  patternDotOne: {
    top: 60,
    right: 110,
  },
  patternDotTwo: {
    bottom: 60,
    left: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.md,
    paddingTop: SIZING.spacing.xs,
    minHeight: 52,
  },
  headerLeft: {
    minWidth: 110,
  },
  headerCenter: {
    position: 'absolute',
    left: 120,
    right: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonWrap: {
    position: 'absolute',
    top: 0,
    right: SIZING.spacing.md,
  },
  title: { fontSize: SIZING.font.h2, fontWeight: '700' },
  subtitle: { fontSize: SIZING.font.body, marginBottom: SIZING.spacing.sm },
  backButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
  },
  content: { padding: SIZING.spacing.md, gap: SIZING.spacing.sm },
  hunterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SIZING.spacing.md,
  },
  hunterCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: SIZING.spacing.sm,
    width: '48%',
    minHeight: 220,
    position: 'relative',
    flexDirection: 'column',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  hunterCardImage: {
    width: 92,
    height: 128,
  },
  hunterCardMeta: {
    width: '100%',
    alignItems: 'center',
    gap: SIZING.spacing.xs,
  },
  hunterCardTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  hunterCardType: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  hunterCardHint: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: SIZING.spacing.sm,
    right: SIZING.spacing.sm,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: 4,
  },
  lockBadgeText: {
    fontSize: SIZING.font.small,
    fontWeight: '700',
    letterSpacing: 1,
  },
  detailContainer: {
    flex: 1,
    paddingHorizontal: SIZING.spacing.md,
    paddingBottom: SIZING.spacing.md,
    paddingTop: SIZING.spacing.sm,
  },
  detailPanel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: SIZING.spacing.sm,
  },
  detailBody: {
    flex: 1,
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  detailImagePane: {
    width: 250,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageTypeChip: {
    position: 'absolute',
    right: SIZING.spacing.sm,
    bottom: SIZING.spacing.sm,
    fontSize: SIZING.font.small,
    fontWeight: '700',
    borderRadius: 999,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  detailImage: {
    width: 230,
    height: '95%',
  },
  detailRightColumn: {
    flex: 1,
    gap: SIZING.spacing.sm,
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: 8,
    gap: 4,
  },
  statsCardTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
  },
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SIZING.spacing.sm,
  },
  meta: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    textAlign: 'right',
  },
  statsColumns: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
  },
  statsColumn: {
    flex: 1,
    gap: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
    gap: SIZING.spacing.xs,
  },
  statLabel: {
    fontWeight: '700',
    fontSize: SIZING.font.small,
  },
  statValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  backstoryCard: {
    flex: 2.5,
    borderWidth: 1,
    borderRadius: 10,
    padding: SIZING.spacing.sm,
  },
  backstoryTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
    marginBottom: SIZING.spacing.xs,
  },
  backstoryBoostName: {
    fontSize: SIZING.font.body,
    fontWeight: '700',
    marginBottom: 2,
  },
  hackBoostSummary: {
    fontSize: SIZING.font.small,
    lineHeight: 20,
    marginBottom: SIZING.spacing.xs,
  },
  hackBoostEffect: {
    fontSize: SIZING.font.small,
    lineHeight: 20,
    fontWeight: '600',
  },
  backstoryDivider: {
    marginVertical: SIZING.spacing.xs,
    fontWeight: '700',
  },
  backstoryScroll: {
    flex: 1,
  },
  backstoryScrollContent: {
    paddingBottom: SIZING.spacing.sm,
  },
  backstoryText: {
    fontSize: SIZING.font.body,
    lineHeight: 26,
  },
  unlockFooter: {
    marginTop: SIZING.spacing.sm,
    paddingTop: SIZING.spacing.sm,
    borderTopWidth: 1,
    gap: SIZING.spacing.xs,
  },
  subtle: { fontSize: SIZING.font.small, lineHeight: 18 },
  unlockButton: {
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  unlockButtonText: { fontWeight: '700' },
  loadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 80,
  },
});
