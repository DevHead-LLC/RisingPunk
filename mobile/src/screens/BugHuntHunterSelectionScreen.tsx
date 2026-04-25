import React from 'react';
import { Alert } from 'react-native';
import { Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useThemeColors } from '../hooks/useThemeColors';
import {
  ANT_BUG_IMAGE,
  BUG_HUNT_ROSTER_ID_KAITO,
  BUG_HUNT_VISUAL_KEY_KAITO_SPRINT,
  KAITO_GLITCH_SPRINT_IMAGE,
} from '../constants/hackMapBugHuntVisuals';
import { useFetchBugHuntTokenStateQuery, useFetchMyHuntersQuery } from '../store/api/bugHuntApi';
import { useGetMyMapPositionQuery } from '../store/api/mapApi';
import { useLaunchAttackMarchMutation } from '../store/api/attackApi';
import { formatBalance } from '../components/common/Balance';
import { createBugHuntHunterSelectionStyles } from './BugHuntHunterSelectionScreenStyles';

const ANT_HUNT_COST_TOKENS = 900;
const VISIBLE_SLOTS = 6;
const ACTIVE_SLOTS = 1;
const BUG_PANEL_BORDER = '#F2D36B';
const BUG_PANEL_BG = 'rgba(242, 211, 107, 0.16)';
const BATTLE_PANEL_BORDER = '#4C9DFF';
const BATTLE_PANEL_BG = 'rgba(76, 157, 255, 0.16)';
const SLOT_ENABLED_BG = '#F3F6FF';
const SLOT_DISABLED_BG = '#A5ACBA';
const SLOT_ENABLED_TEXT = '#151A2A';

type Props = {
  bugInstanceId: string;
  bugCell: { x: number; y: number };
  bugHpPercent: number;
  onClose: () => void;
  onLaunched?: (marchId: string) => void;
};

export const BugHuntHunterSelectionScreen: React.FC<Props> = ({
  bugInstanceId,
  bugCell,
  bugHpPercent,
  onClose,
  onLaunched,
}) => {
  const styles = React.useMemo(() => createBugHuntHunterSelectionStyles(), []);
  const colors = useThemeColors();
  const { data } = useFetchMyHuntersQuery();
  const { data: tokenStateData } = useFetchBugHuntTokenStateQuery();
  const { data: myMapPos } = useGetMyMapPositionQuery();
  const [launchAttackMarch, { isLoading: isLaunching }] = useLaunchAttackMarchMutation();
  const [selectedHunterRosterIds, setSelectedHunterRosterIds] = React.useState<string[]>([]);
  const hasKaito = (data?.hunters ?? []).some((h) => h.hunterRosterId === BUG_HUNT_ROSTER_ID_KAITO);
  const hasEnoughTokens = tokenStateData != null && tokenStateData.currentTokens >= ANT_HUNT_COST_TOKENS;
  const slotOneHunterRosterId = selectedHunterRosterIds[0] ?? null;
  const slotOneAssigned = slotOneHunterRosterId != null;
  const canLaunch = hasEnoughTokens && slotOneAssigned && !isLaunching;
  const patternRows = React.useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  const patternCols = React.useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  const handleToggleHunterSelection = React.useCallback(
    (hunterRosterId: string) => {
      setSelectedHunterRosterIds((prev) => {
        const selectedIdx = prev.indexOf(hunterRosterId);
        if (selectedIdx >= 0) {
          const next = [...prev];
          next.splice(selectedIdx, 1);
          return next;
        }
        if (prev.length >= ACTIVE_SLOTS) {
          Alert.alert('Slot full', 'Only Slot 1 is active right now. Unassign current hunter first.');
          return prev;
        }
        return [...prev, hunterRosterId];
      });
    },
    []
  );

  const handleSlotPress = React.useCallback((slotIdx: number) => {
    setSelectedHunterRosterIds((prev) => {
      if (slotIdx < 0 || slotIdx >= prev.length) return prev;
      const next = [...prev];
      next.splice(slotIdx, 1);
      return next;
    });
  }, []);

  const handleLaunch = React.useCallback(async () => {
    // Inline canLaunch primitives (not only `canLaunch`) so deps and guard cannot drift (Bugbot: stale closure).
    if (!hasEnoughTokens || !slotOneAssigned || isLaunching || slotOneHunterRosterId !== BUG_HUNT_ROSTER_ID_KAITO) {
      return;
    }
    if (!myMapPos || !Number.isFinite(myMapPos.x) || !Number.isFinite(myMapPos.y)) {
      Alert.alert(
        'Home position unavailable',
        'Open Hack Map first so your turf location can load, then try launching again.'
      );
      return;
    }
    try {
      const result = await launchAttackMarch({
        attackType: 'bug_hunt',
        bugInstanceId,
        hunterRosterId: slotOneHunterRosterId,
        hunterVisualKey: BUG_HUNT_VISUAL_KEY_KAITO_SPRINT,
        userBattalions: [],
        screenWidth: 844,
        screenHeight: 390,
        originX: Math.floor(myMapPos.x),
        originY: Math.floor(myMapPos.y),
        hackMapCellX: bugCell.x,
        hackMapCellY: bugCell.y,
      }).unwrap();
      if (!result.success || !result.data?.marchId) {
        const err = typeof result.error === 'string' && result.error.length > 0 ? result.error : 'Could not launch bug-hunt march.';
        Alert.alert('Launch failed', err);
        return;
      }
      onLaunched?.(result.data.marchId);
      onClose();
    } catch (error: unknown) {
      const dataErr =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { error?: unknown } }).data
          : undefined;
      const message =
        dataErr && typeof dataErr.error === 'string' && dataErr.error.length > 0
          ? dataErr.error
          : 'Launch failed. Please try again.';
      Alert.alert('Launch failed', message);
    }
  }, [
    hasEnoughTokens,
    slotOneAssigned,
    isLaunching,
    slotOneHunterRosterId,
    myMapPos,
    launchAttackMarch,
    bugInstanceId,
    bugCell.x,
    bugCell.y,
    onLaunched,
    onClose,
  ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.patternLayer} pointerEvents="none">
        <View style={[styles.patternBeam, styles.patternBeamA, { backgroundColor: `${colors.matrix}20` }]} />
        <View style={[styles.patternBeam, styles.patternBeamB, { backgroundColor: `${colors.secondary}1F` }]} />
        {patternRows.map((r) =>
          patternCols.map((c) => (
            <View
              key={`dot-${r}-${c}`}
              style={[
                styles.patternDot,
                {
                  left: 8 + c * 24 + ((r % 2) * 8),
                  top: 100 + r * 22,
                  borderColor: `${colors.text.secondary}22`,
                },
              ]}
            />
          ))
        )}
      </View>

      <View style={{ flex: 1, width: '100%', maxWidth: 980, alignSelf: 'center' }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>BUG HUNT LOADOUT</Text>
          <CloseButton onPress={onClose} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.slotStrip}>
            {Array.from({ length: VISIBLE_SLOTS }, (_, idx) => {
              const slotNumber = idx + 1;
              const isEnabled = idx < ACTIVE_SLOTS;
              const assignedRosterId = selectedHunterRosterIds[idx];
              const isFilled = typeof assignedRosterId === 'string';
              const isKaito = assignedRosterId === BUG_HUNT_ROSTER_ID_KAITO;
              return (
                <Pressable
                  key={`slot-${slotNumber}`}
                  style={[
                    styles.slotCell,
                    {
                      borderColor: isEnabled ? SLOT_ENABLED_BG : `${SLOT_DISABLED_BG}CC`,
                      backgroundColor: isEnabled ? SLOT_ENABLED_BG : `${SLOT_DISABLED_BG}4D`,
                    },
                    isFilled ? { borderColor: colors.matrix, backgroundColor: `${colors.matrix}24` } : null,
                  ]}
                  onPress={() => handleSlotPress(idx)}
                  disabled={!isEnabled || !isFilled}
                >
                  <Text style={[styles.slotIndex, { color: isEnabled ? SLOT_ENABLED_TEXT : `${colors.text.secondary}` }]}>
                    {slotNumber}
                  </Text>
                  <Text style={[styles.slotState, { color: isEnabled ? SLOT_ENABLED_TEXT : `${colors.text.secondary}` }]}>
                    {!isEnabled ? 'LOCKED' : isKaito ? 'KAITO' : 'EMPTY'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.bugIntelCard, { borderColor: BUG_PANEL_BORDER, backgroundColor: BUG_PANEL_BG }]}>
            <View style={styles.bugIntelLeft}>
              <Image source={ANT_BUG_IMAGE} style={styles.bugImage} resizeMode="contain" />
              <View style={styles.bugTextWrap}>
                <Text style={[styles.bugLabel, { color: colors.text.secondary }]}>TARGET</Text>
                <Text style={[styles.bugTitle, { color: colors.text.primary }]}>ANT BUG</Text>
                <Text style={[styles.bugMeta, { color: colors.text.secondary }]}>
                  Coordinates: ({bugCell.x}, {bugCell.y}) | HP {bugHpPercent.toFixed(2)}%
                </Text>
              </View>
            </View>
            <View style={[styles.bugTypeChip, { borderColor: BUG_PANEL_BORDER, backgroundColor: 'rgba(0, 0, 0, 0.28)' }]}>
              <Text style={[styles.bugTypeLabel, { color: BUG_PANEL_BORDER }]}>TYPE: BRUTE</Text>
              <Text style={[styles.bugWeakness, { color: colors.text.secondary }]}>Weak vs Sprint</Text>
            </View>
          </View>

          <View style={[styles.battleIntelCard, { borderColor: BATTLE_PANEL_BORDER, backgroundColor: BATTLE_PANEL_BG }]}>
            <Text style={[styles.battleIntelTitle, { color: BATTLE_PANEL_BORDER }]}>BATTLE INTEL</Text>
            <Text style={[styles.battleIntelRow, { color: colors.text.primary }]}>
              Hunt Cost: {ANT_HUNT_COST_TOKENS} tokens
            </Text>
            {tokenStateData ? (
              <Text style={[styles.battleIntelRow, { color: colors.text.primary }]}>
                Tokens: {formatBalance(tokenStateData.currentTokens)}/{formatBalance(tokenStateData.maxTokens)}
              </Text>
            ) : (
              <Text style={[styles.battleIntelRow, { color: colors.text.secondary }]}>Tokens: Syncing...</Text>
            )}
            <Text style={[styles.battleIntelRow, { color: colors.text.primary }]}>
              Assigned Lead (Slot 1): {slotOneHunterRosterId === BUG_HUNT_ROSTER_ID_KAITO ? 'Kaito Glitch' : 'None'}
            </Text>
            <Text style={[styles.battleIntelHint, { color: colors.text.secondary }]}>
              Tip: Slot 1 controls the march icon and lead hunter behavior.
            </Text>
          </View>

          <View style={[styles.rosterPanel, { borderColor: colors.secondary, backgroundColor: `${colors.background}D1` }]}>
            <Text style={[styles.rosterTitle, { color: colors.secondary }]}>HUNTER ROSTER</Text>
            {hasKaito ? (
              <Pressable
                style={[
                  styles.hunterOptionCard,
                  {
                    borderColor:
                      selectedHunterRosterIds.includes(BUG_HUNT_ROSTER_ID_KAITO) ? colors.matrix : `${colors.text.secondary}66`,
                    backgroundColor:
                      selectedHunterRosterIds.includes(BUG_HUNT_ROSTER_ID_KAITO) ? `${colors.matrix}22` : `${colors.background}A8`,
                  },
                ]}
                onPress={() => handleToggleHunterSelection(BUG_HUNT_ROSTER_ID_KAITO)}
              >
                <Image source={KAITO_GLITCH_SPRINT_IMAGE} style={styles.hunterImage} resizeMode="contain" />
                <View style={styles.hunterOptionMeta}>
                  <Text style={[styles.hunterName, { color: colors.text.primary }]}>Kaito Glitch</Text>
                  <Text style={[styles.hunterType, { color: colors.secondary }]}>Type: Sprint</Text>
                  <Text style={[styles.hunterHint, { color: colors.text.secondary }]}>
                    {selectedHunterRosterIds.includes(BUG_HUNT_ROSTER_ID_KAITO)
                      ? 'Assigned to Slot 1 (tap to unassign)'
                      : 'Tap to assign to next available slot'}
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Text style={[styles.lockedRosterText, { color: colors.text.secondary }]}>
                No hunters unlocked. Unlock Kaito Glitch in Hunter Facility first.
              </Text>
            )}
          </View>

          <Pressable
            style={[
              styles.huntButton,
              {
                backgroundColor: canLaunch ? colors.matrix : colors.buttonDisabled,
                opacity: canLaunch ? 1 : 0.72,
              },
            ]}
            disabled={!canLaunch}
            onPress={handleLaunch}
          >
            <Text style={[styles.huntButtonText, { color: colors.background }]}>
              {slotOneAssigned
                ? !hasEnoughTokens
                  ? `Need ${ANT_HUNT_COST_TOKENS} tokens`
                  : isLaunching
                    ? 'Launching hunt...'
                    : `Hunt Bug (-${ANT_HUNT_COST_TOKENS} tokens)`
                : hasKaito
                  ? 'Assign hunter to Slot 1'
                  : 'Unlock hunter first'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};
