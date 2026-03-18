import React, { useState, useCallback } from 'react';
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

interface PresetBarProps {
  botCounts: Record<BotType, number>;
  userBalance: number;
  unlockedSlots: {
    isBattalionCUnlocked: boolean;
    isBattalionDUnlocked: boolean;
    isBattalionEUnlocked: boolean;
    isBattalionFUnlocked: boolean;
  };
  onApplyPreset: (assignments: Record<string, BattalionAssignment>) => void;
}

export const PresetBar = React.memo(({ botCounts, userBalance, unlockedSlots, onApplyPreset }: PresetBarProps) => {
  const colors = useThemeColors();
  const { data: presetsData } = useGetBattlePresetsQuery();
  const [unlockPreset] = useUnlockPresetMutation();
  const maxBattalionSize = useBattalionMaxSize();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

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

  const applyPreset = useCallback((preset: PresetData) => {
    if (!preset.battalions || Object.keys(preset.battalions).length === 0) {
      showBanner('Set up this preset in Profile > Battles.');
      return;
    }

    const remaining: Record<string, number> = {
      breacher: botCounts.breacher ?? 0,
      guardian: botCounts.guardian ?? 0,
      phreak: botCounts.phreak ?? 0,
    };

    const newAssignments: Record<string, BattalionAssignment> = {};
    const fillOrder = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (const slotId of fillOrder) {
      if (!isSlotUnlocked(slotId)) continue;

      const config = preset.battalions[slotId];
      if (!config || config.quantity <= 0) continue;

      const available = remaining[config.botType] ?? 0;
      if (available <= 0) continue;

      const toAssign = Math.min(config.quantity, available, maxBattalionSize);
      remaining[config.botType] -= toAssign;

      newAssignments[slotId] = {
        botType: config.botType,
        quantity: toAssign,
        markLevel: 1,
      };
    }

    onApplyPreset(newAssignments);
  }, [botCounts, isSlotUnlocked, onApplyPreset, showBanner, maxBattalionSize]);

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

    applyPreset(preset);
  }, [presetsData?.userLevel, userBalance, unlockPreset, applyPreset, showBanner]);

  if (!presetsData) return null;

  const presetList = ['1', '2', '3'].map(id => presetsData.presets[id]);
  const userLevel = presetsData.userLevel ?? 0;

  return (
    <>
      <View style={styles.container}>
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
