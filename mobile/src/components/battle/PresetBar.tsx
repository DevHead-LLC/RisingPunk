import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import {
  useGetBattlePresetsQuery,
  useUnlockPresetMutation,
  type PresetData,
} from '../../store/api/battlePresetsApi';
import { NotificationBanner } from '../common/NotificationBanner';
import type { BattalionAssignment } from './BattalionSlot';
import type { BotType } from '../../types/bots';
import { useBattalionMaxSize } from '../../hooks/useBattalionSlotUnlocks';
import { useFetchBotsQuery } from '../../store/api/botsApi';
import { inventoryKeyForFamilyAndMark, MARK2_DISPLAY_NAMES } from '../../utils/botInventory';

const BOT_TYPES: readonly BotType[] = ['breacher', 'guardian', 'phreak'];

const INVENTORY_KEYS = [
  'breacher',
  'guardian',
  'phreak',
  'breacherM2',
  'guardianM2',
  'phreakM2',
] as const;

/** M1 + M2 inventory keys from `GET /api/bots` `bots` object. */
function normalizeFullInventory(raw: unknown): Record<string, number> {
  const n = (v: unknown): number => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      return Math.max(0, Math.floor(v));
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const parsed = Number(v);
      if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
    }
    return 0;
  };
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') {
    for (const k of INVENTORY_KEYS) out[k] = 0;
    return out;
  }
  const o = raw as Record<string, unknown>;
  for (const k of INVENTORY_KEYS) {
    out[k] = n(o[k]);
  }
  return out;
}

function normalizePresetBotType(raw: string): BotType | null {
  const s = raw.trim().toLowerCase();
  return BOT_TYPES.includes(s as BotType) ? (s as BotType) : null;
}

function labelForBotType(t: BotType): string {
  if (t === 'breacher') return 'Breacher';
  if (t === 'guardian') return 'Guardian';
  return 'Phreak';
}

function collectPresetSlotNeeds(preset: PresetData): Array<{ botType: BotType; markLevel: 1 | 2 }> {
  const fillOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seen = new Set<string>();
  const out: Array<{ botType: BotType; markLevel: 1 | 2 }> = [];
  if (!preset.battalions) return out;
  const rec = preset.battalions as Record<string, { botType: string; quantity: number; markLevel?: number }>;
  for (const slotId of fillOrder) {
    const c = rec[slotId] ?? rec[slotId.toLowerCase()];
    if (!c || c.quantity <= 0) continue;
    const bt = normalizePresetBotType(c.botType);
    if (!bt) continue;
    const markLevel: 1 | 2 = c.markLevel === 2 ? 2 : 1;
    const sig = `${bt}:${markLevel}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push({ botType: bt, markLevel });
  }
  return out;
}

function presetHasConfiguredSlots(preset: PresetData): boolean {
  const fillOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
  if (!preset.battalions) return false;
  const rec = preset.battalions as Record<string, { botType: string; quantity: number; markLevel?: number }>;
  return fillOrder.some((id) => {
    const c = rec[id] ?? rec[id.toLowerCase()];
    return c != null && c.quantity > 0 && normalizePresetBotType(c.botType) != null;
  });
}

interface PresetBarProps {
  botCounts: Record<BotType, number>;
  userBalance: number;
  unlockedSlots: {
    isBattalionCUnlocked: boolean;
    isBattalionDUnlocked: boolean;
    isBattalionEUnlocked: boolean;
    isBattalionFUnlocked: boolean;
  };
  /** presetId + assignments; returns a promise so the bar can debounce UI and await one sync at a time. */
  onApplyPreset: (presetId: string, assignments: Record<string, BattalionAssignment>) => Promise<void>;
  maxBattalionSizeOverride?: number;
}

export const PresetBar = React.memo(({ botCounts, userBalance, unlockedSlots, onApplyPreset, maxBattalionSizeOverride }: PresetBarProps) => {
  const colors = useThemeColors();
  const { data: presetsData, refetch: refetchPresets } = useGetBattlePresetsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: botsQueryData } = useFetchBotsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const effectiveFullInventory = useMemo(() => {
    const src = botsQueryData?.bots != null ? botsQueryData.bots : botCounts;
    return normalizeFullInventory(src);
  }, [botsQueryData?.bots, botCounts]);
  const [unlockPreset] = useUnlockPresetMutation();
  const maxBattalionSizeFromResearch = useBattalionMaxSize();
  const maxBattalionSize =
    typeof maxBattalionSizeOverride === 'number' &&
    Number.isFinite(maxBattalionSizeOverride) &&
    maxBattalionSizeOverride > 0
      ? Math.floor(maxBattalionSizeOverride)
      : maxBattalionSizeFromResearch;
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');
  /** Sync gate so two taps in the same tick cannot both start onApplyPreset (state updates are async). */
  const presetApplyGateRef = useRef(false);
  const [presetApplyBusy, setPresetApplyBusy] = useState(false);

  const showBanner = useCallback((msg: string) => {
    setBannerVisible(false);
    setTimeout(() => {
      setBannerMessage(msg);
      setBannerVisible(true);
    }, 50);
  }, []);

  const isSlotUnlocked = useCallback((slotId: string): boolean => {
    if (slotId === 'A' || slotId === 'B') return true;
    if (slotId === 'C') return unlockedSlots.isBattalionCUnlocked;
    if (slotId === 'D') return unlockedSlots.isBattalionDUnlocked;
    if (slotId === 'E') return unlockedSlots.isBattalionEUnlocked;
    if (slotId === 'F') return unlockedSlots.isBattalionFUnlocked;
    return false;
  }, [unlockedSlots]);

  const getSlotConfig = useCallback((battalions: PresetData['battalions'], slotId: string) => {
    if (!battalions) return undefined;
    const rec = battalions as Record<string, { botType: string; quantity: number; markLevel?: number }>;
    return rec[slotId] ?? rec[slotId.toLowerCase()];
  }, []);

  const buildAssignmentsForPreset = useCallback(
    (preset: PresetData, inventory: Record<string, number>): Record<string, BattalionAssignment> | null => {
      const fillOrder = ['A', 'B', 'C', 'D', 'E', 'F'];
      const hasConfigured = fillOrder.some((id) => {
        const c = getSlotConfig(preset.battalions, id);
        return c != null && c.quantity > 0 && normalizePresetBotType(c.botType) != null;
      });
      if (!hasConfigured) {
        return null;
      }

      const remaining: Record<string, number> = { ...inventory };

      const newAssignments: Record<string, BattalionAssignment> = {};

      for (const slotId of fillOrder) {
        if (!isSlotUnlocked(slotId)) continue;

        const config = getSlotConfig(preset.battalions, slotId);
        if (!config || config.quantity <= 0) continue;

        const bt = normalizePresetBotType(config.botType);
        if (!bt) continue;

        const markLevel: 1 | 2 = config.markLevel === 2 ? 2 : 1;
        const invKey = inventoryKeyForFamilyAndMark(bt, markLevel);
        const available = remaining[invKey] ?? 0;
        if (available <= 0) continue;

        const toAssign = Math.min(config.quantity, available, maxBattalionSize);
        remaining[invKey] = available - toAssign;

        newAssignments[slotId] = {
          botType: bt,
          quantity: toAssign,
          markLevel,
        };
      }

      return Object.keys(newAssignments).length > 0 ? newAssignments : null;
    },
    [isSlotUnlocked, maxBattalionSize, getSlotConfig]
  );

  const handlePresetPress = useCallback(async (preset: PresetData) => {
    const userLevel = presetsData?.userLevel ?? 0;

    if (userLevel < preset.levelRequired) {
      const msgs: string[] = [];
      msgs.push(`Reach Level ${preset.levelRequired}`);
      if (userBalance < preset.cost) {
        msgs.push(`$${preset.cost.toLocaleString()} required`);
      }
      showBanner(msgs.join(' and '));
      return;
    }

    if (!preset.unlocked) {
      if (userBalance < preset.cost) {
        showBanner(`Insufficient funds — $${preset.cost.toLocaleString()} required.`);
        return;
      }

      Alert.alert(
        `Unlock Preset ${preset.id}?`,
        `Cost: $${preset.cost.toLocaleString()}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlock',
            onPress: async () => {
              try {
                await unlockPreset({ presetId: preset.id }).unwrap();
                showBanner(`Preset ${preset.id} unlocked!`);
              } catch (err: any) {
                const msg = err?.data?.error ?? 'Failed to unlock preset.';
                showBanner(msg);
              }
            },
          },
        ],
      );
      return;
    }

    /** Always refetch before apply so Profile saves are not masked by stale RTK cache. */
    let presetsPayload = presetsData;
    try {
      const result = await refetchPresets();
      if (result.data) {
        presetsPayload = result.data;
      }
    } catch {
      /* use presetsPayload as-is */
    }

    const presetFromCache = presetsPayload?.presets?.[preset.id];
    if (!presetFromCache) {
      showBanner('Preset data not loaded.');
      return;
    }

    const built = buildAssignmentsForPreset(presetFromCache, effectiveFullInventory);
    if (!built) {
      if (!presetHasConfiguredSlots(presetFromCache)) {
        showBanner('Set up this preset in Profile > Battles.');
        return;
      }
      const needed = collectPresetSlotNeeds(presetFromCache);
      const missing = needed.filter(({ botType, markLevel }) => {
        const key = inventoryKeyForFamilyAndMark(botType, markLevel);
        return (effectiveFullInventory[key] ?? 0) <= 0;
      });
      if (missing.length > 0) {
        const names = missing
          .map(({ botType, markLevel }) =>
            markLevel === 2
              ? `${MARK2_DISPLAY_NAMES[botType]} (M2)`
              : `${labelForBotType(botType)} (M1)`
          )
          .join(', ');
        showBanner(
          `This preset needs ${names}, but you have none in your army. Build them in Digital Barracks, or use a preset that matches troops you already have.`,
        );
        return;
      }
      showBanner('Could not fill this preset. Some battalion slots may be locked — unlock them in research or assign manually.');
      return;
    }

    if (presetApplyGateRef.current) {
      return;
    }
    presetApplyGateRef.current = true;
    setPresetApplyBusy(true);
    try {
      await onApplyPreset(preset.id, built);
    } catch {
      // Parent handles alert; applies are serialized in BattlePreparationScreen.
    } finally {
      presetApplyGateRef.current = false;
      setPresetApplyBusy(false);
    }
  }, [
    presetsData,
    presetsData?.userLevel,
    presetsData?.presets,
    userBalance,
    unlockPreset,
    buildAssignmentsForPreset,
    onApplyPreset,
    showBanner,
    refetchPresets,
    effectiveFullInventory,
  ]);

  if (!presetsData) return null;

  const presetList = (['1', '2', '3'] as const)
    .map((id) => presetsData.presets[id])
    .filter((p): p is PresetData => p != null);
  const userLevel = presetsData.userLevel ?? 0;

  return (
    <>
      <View style={[styles.container, presetApplyBusy && { opacity: 0.55 }]} pointerEvents={presetApplyBusy ? 'none' : 'auto'}>
        {presetList.map(preset => {
          const isUnderLevel = userLevel < preset.levelRequired;
          const isPurchased = preset.unlocked;

          return (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetButton,
                { borderColor: colors.matrix + '55' },
                isPurchased && { borderColor: colors.matrix, backgroundColor: colors.matrix + '15' },
                isUnderLevel && { opacity: 0.45 },
              ]}
              onPress={() => handlePresetPress(preset)}
              activeOpacity={0.7}
              disabled={presetApplyBusy}
            >
              <Text style={[
                styles.presetLabel,
                { color: isPurchased ? colors.matrix : colors.text.primary + '88' },
              ]}>
                P{preset.id}
              </Text>
              {!isPurchased && (
                <Text style={[styles.presetSublabel, { color: colors.text.primary + '55' }]}>
                  Lv{preset.levelRequired}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <NotificationBanner
        visible={bannerVisible}
        message={bannerMessage}
        type="info"
        onClose={() => setBannerVisible(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: SIZING.spacing.sm,
    paddingBottom: Platform.OS === 'android' ? 2 : 4,
  },
  presetButton: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 52,
  },
  presetLabel: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  presetSublabel: {
    fontSize: Math.max(SIZING.font.small * 0.7, 9),
    marginTop: 1,
  },
});
