import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  ActionSheetIOS,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import {
  useGetBattlePresetsQuery,
  useSaveBattlePresetMutation,
  type PresetBattalionConfig,
  type PresetData,
} from '../../store/api/battlePresetsApi';
import { useGetUserFeaturesQuery } from '../../store/api/researchFeaturesApi';
import { useAppSelector } from '../../store/hooks';
import { BOT_FAMILY_ORDER, MARK2_DISPLAY_NAMES } from '../../utils/botInventory';
import { useFetchMyHuntersQuery } from '../../store/api/bugHuntApi';
import { BUG_HUNT_ROSTER_ID_KAITO, KAITO_GLITCH_HEADSHOT_IMAGE } from '../../constants/hackMapBugHuntVisuals';
import { CircleSlot } from '../battle/CircleSlot';

const BATTALION_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
type BotType = 'breacher' | 'guardian' | 'phreak';

const PRESET_BOT_META: Record<BotType, { typeLabel: string; m1Name: string }> = {
  breacher: { typeLabel: 'Brute', m1Name: 'Breacher' },
  guardian: { typeLabel: 'Sprint', m1Name: 'Guardian' },
  phreak: { typeLabel: 'Remote', m1Name: 'Phreak' },
};

type SlotChoice = { botType: BotType; markLevel: 1 | 2; label: string };

function buildAllChoices(mark2Unlocked: boolean): SlotChoice[] {
  const rows: SlotChoice[] = [];
  for (const botType of BOT_FAMILY_ORDER) {
    const meta = PRESET_BOT_META[botType];
    rows.push({
      botType,
      markLevel: 1,
      label: `${meta.m1Name} (${meta.typeLabel}) · M1`,
    });
    if (mark2Unlocked) {
      const m2Name = MARK2_DISPLAY_NAMES[botType];
      rows.push({
        botType,
        markLevel: 2,
        label: `${m2Name} (${meta.typeLabel}) · M2`,
      });
    }
  }
  return rows;
}

function choiceKey(botType: BotType, markLevel: 1 | 2): string {
  return `${botType}:${markLevel}`;
}

function parseChoiceKey(s: string): { botType: BotType; markLevel: 1 | 2 } | null {
  const [a, b] = s.split(':');
  if (a !== 'breacher' && a !== 'guardian' && a !== 'phreak') return null;
  if (b !== '1' && b !== '2') return null;
  return { botType: a, markLevel: b === '2' ? 2 : 1 };
}

function battalionsFromSig(sig: string): PresetData['battalions'] {
  try {
    const o = JSON.parse(sig) as unknown;
    if (o == null || typeof o !== 'object' || Array.isArray(o)) return null;
    return o as Record<string, PresetBattalionConfig>;
  } catch {
    return null;
  }
}

function buildInitialBattalions(
  presetBattalions: PresetData['battalions'],
  options: SlotChoice[]
): Record<string, { choiceKey: string; quantity: string }> {
  const result: Record<string, { choiceKey: string; quantity: string }> = {};
  for (const id of BATTALION_IDS) {
    const existing = presetBattalions?.[id];
    const bt = (existing?.botType ?? 'breacher') as BotType;
    const ml: 1 | 2 = existing?.markLevel === 2 ? 2 : 1;
    const key = choiceKey(bt, ml);
    const valid = options.some((c) => choiceKey(c.botType, c.markLevel) === key);
    result[id] = {
      choiceKey: valid ? key : choiceKey('breacher', 1),
      quantity: existing?.quantity != null ? String(existing.quantity) : '',
    };
  }
  return result;
}

interface PresetEditorProps {
  preset: PresetData;
  colors: any;
  choiceOptions: SlotChoice[];
  hasKaitoHunter: boolean;
  onSavePreset: (
    presetId: string,
    battalions: Record<string, PresetBattalionConfig>,
    hunterSlots: Partial<Record<'1' | '2' | '3', 'kaito_glitch'>>
  ) => Promise<void>;
  isSaving: boolean;
}

/** Must match landscape-only `UISupportedInterfaceOrientations` in Info.plist. */
const MODAL_LANDSCAPE_ORIENTATIONS = ['landscape-left', 'landscape-right'] as const;

const PresetEditor = React.memo(
  ({ preset, colors, choiceOptions, hasKaitoHunter, onSavePreset, isSaving }: PresetEditorProps) => {
  const serverBattalionsSig = useMemo(
    () => JSON.stringify(preset.battalions ?? {}),
    [preset.battalions]
  );

  const [battalions, setBattalions] = useState(() =>
    buildInitialBattalions(preset.battalions, choiceOptions)
  );
  const [hunterSlots, setHunterSlots] = useState<{ '1': 'kaito_glitch' | null; '2': null; '3': null }>(() => ({
    '1': preset.hunterSlots?.['1'] === BUG_HUNT_ROSTER_ID_KAITO ? BUG_HUNT_ROSTER_ID_KAITO : null,
    '2': null,
    '3': null,
  }));

  useEffect(() => {
    setBattalions(buildInitialBattalions(battalionsFromSig(serverBattalionsSig), choiceOptions));
    setHunterSlots({
      '1': preset.hunterSlots?.['1'] === BUG_HUNT_ROSTER_ID_KAITO ? BUG_HUNT_ROSTER_ID_KAITO : null,
      '2': null,
      '3': null,
    });
  }, [preset.id, preset.hunterSlots, serverBattalionsSig, choiceOptions]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [openBotPickerForRow, setOpenBotPickerForRow] = useState<string | null>(null);

  const labelForChoiceKey = useCallback(
    (key: string): string => {
      const parsed = parseChoiceKey(key);
      if (!parsed) return choiceOptions[0]?.label ?? '';
      const c = choiceOptions.find(
        (o) => o.botType === parsed.botType && o.markLevel === parsed.markLevel
      );
      return c?.label ?? choiceOptions[0]?.label ?? '';
    },
    [choiceOptions]
  );

  const handleChoiceKeyChange = useCallback((battalionId: string, key: string) => {
    setBattalions((prev) => ({
      ...prev,
      [battalionId]: { ...prev[battalionId], choiceKey: key },
    }));
    setSaveMessage(null);
    setOpenBotPickerForRow(null);
  }, []);

  const openIosBotPicker = useCallback(
    (rowId: string) => {
      const labels = choiceOptions.map((o) => o.label);
      const cancelIndex = labels.length;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, 'Cancel'],
          cancelButtonIndex: cancelIndex,
        },
        (buttonIndex) => {
          if (buttonIndex === cancelIndex) return;
          const opt = choiceOptions[buttonIndex];
          if (opt) {
            handleChoiceKeyChange(rowId, choiceKey(opt.botType, opt.markLevel));
          }
        }
      );
    },
    [choiceOptions, handleChoiceKeyChange]
  );

  const handleQuantityChange = useCallback((battalionId: string, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setBattalions((prev) => ({
      ...prev,
      [battalionId]: { ...prev[battalionId], quantity: cleaned },
    }));
    setSaveMessage(null);
  }, []);

  const handleSave = useCallback(async () => {
    const payload: Record<string, PresetBattalionConfig> = {};
    for (const [id, config] of Object.entries(battalions)) {
      const qty = parseInt(config.quantity, 10);
      if (qty > 0) {
        const parsed = parseChoiceKey(config.choiceKey);
        if (!parsed) continue;
        payload[id] = {
          botType: parsed.botType,
          quantity: qty,
          markLevel: parsed.markLevel,
        };
      }
    }

    const hasHunterSelected = hunterSlots['1'] === BUG_HUNT_ROSTER_ID_KAITO;
    if (Object.keys(payload).length === 0 && !hasHunterSelected) {
      setSaveMessage('Configure at least one battalion or Hunter Slot 1.');
      return;
    }

    try {
      const hunterPayload: Partial<Record<'1' | '2' | '3', 'kaito_glitch'>> = {};
      if (hunterSlots['1'] === BUG_HUNT_ROSTER_ID_KAITO) {
        hunterPayload['1'] = BUG_HUNT_ROSTER_ID_KAITO;
      }
      await onSavePreset(preset.id, payload, hunterPayload);
      setSaveMessage('Saved.');
    } catch {
      setSaveMessage('Failed to save.');
    }
  }, [battalions, hunterSlots, preset.id, onSavePreset]);

  const handleHunterSlotOnePress = useCallback(() => {
    if (!hasKaitoHunter) {
      setSaveMessage('Unlock Kaito in Hunter Facility first.');
      return;
    }
    setHunterSlots((prev) => ({
      ...prev,
      '1': prev['1'] === BUG_HUNT_ROSTER_ID_KAITO ? null : BUG_HUNT_ROSTER_ID_KAITO,
    }));
    setSaveMessage(null);
  }, [hasKaitoHunter]);

  return (
    <View style={[styles.presetCard, { borderColor: colors.matrix + '33' }]}>
      <Text style={[styles.presetTitle, { color: colors.matrix }]}>PRESET {preset.id}</Text>
      <View style={styles.hunterSection}>
        <Text style={[styles.hunterSectionTitle, { color: colors.text.primary }]}>HUNTER SLOTS</Text>
        <View style={styles.hunterSlotRow}>
          <CircleSlot
            isEnemy={false}
            isEnabled={hasKaitoHunter}
            isFilled={hunterSlots['1'] === BUG_HUNT_ROSTER_ID_KAITO}
            label={hasKaitoHunter ? 'SLOT 1' : 'LOCKED'}
            filledLabel="KAITO"
            imageSource={hunterSlots['1'] === BUG_HUNT_ROSTER_ID_KAITO ? KAITO_GLITCH_HEADSHOT_IMAGE : undefined}
            onPress={handleHunterSlotOnePress}
          />
          <CircleSlot isEnemy={false} isEnabled={false} label="SLOT 2" />
          <CircleSlot isEnemy={false} isEnabled={false} label="SLOT 3" />
        </View>
      </View>
      {BATTALION_IDS.map((id) => {
        const config = battalions[id];
        return (
          <View key={id} style={styles.battalionRow}>
            <Text style={[styles.battalionLabel, { color: colors.text.primary }]}>{id}</Text>
            <TouchableOpacity
              style={[styles.botDropdown, { borderColor: colors.matrix + '44' }]}
              onPress={() => {
                if (Platform.OS === 'ios') {
                  openIosBotPicker(id);
                } else {
                  setOpenBotPickerForRow(id);
                }
              }}
            >
              <Text style={[styles.botDropdownText, { color: colors.text.primary }]} numberOfLines={2}>
                {labelForChoiceKey(config.choiceKey)}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.quantityInput,
                { color: colors.text.primary, borderColor: colors.matrix + '44' },
              ]}
              value={config.quantity}
              onChangeText={(text) => handleQuantityChange(id, text)}
              keyboardType="number-pad"
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="0"
              placeholderTextColor={colors.text.primary + '44'}
              maxLength={7}
            />
          </View>
        );
      })}
      {Platform.OS === 'android' && (
        <Modal
          visible={openBotPickerForRow != null}
          transparent
          animationType="fade"
          onRequestClose={() => setOpenBotPickerForRow(null)}
          supportedOrientations={[...MODAL_LANDSCAPE_ORIENTATIONS]}
        >
          <View style={styles.botPickerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpenBotPickerForRow(null)} />
            <View
              style={[styles.botPickerContainer, { backgroundColor: colors.surface, borderColor: colors.matrix + '44' }]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={[styles.botPickerTitle, { color: colors.text.primary }]}>Select bot</Text>
              <ScrollView
                style={styles.botPickerScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {choiceOptions.map((opt) => {
                  const key = choiceKey(opt.botType, opt.markLevel);
                  const selected =
                    openBotPickerForRow != null && battalions[openBotPickerForRow]?.choiceKey === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.botPickerOption,
                        { borderBottomColor: colors.text.primary + '22' },
                        selected && { backgroundColor: colors.matrix + '22' },
                      ]}
                      onPress={() => openBotPickerForRow && handleChoiceKeyChange(openBotPickerForRow, key)}
                    >
                      <Text style={[styles.botPickerOptionText, { color: colors.text.primary }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: colors.matrix }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.saveButtonText}>SAVE</Text>
        )}
      </TouchableOpacity>
      {saveMessage && (
        <Text style={[styles.saveMessage, { color: colors.matrix }]}>{saveMessage}</Text>
      )}
    </View>
  );
});

interface LockedPresetProps {
  preset: PresetData;
  colors: any;
}

const LockedPreset = React.memo(({ preset, colors }: LockedPresetProps) => (
  <View style={[styles.presetCard, styles.lockedCard, { borderColor: colors.text.primary + '22' }]}>
    <Text style={[styles.presetTitle, { color: colors.text.primary + '66' }]}>PRESET {preset.id}</Text>
    <Text style={[styles.lockedText, { color: colors.text.primary + '55' }]}>
      Level {preset.levelRequired} · ${preset.cost.toLocaleString()}
    </Text>
    <Text style={[styles.lockedSubtext, { color: colors.text.primary + '44' }]}>Unlock on Battle screen</Text>
  </View>
));

export function BattlesTab(): React.JSX.Element {
  const colors = useThemeColors();
  const token = useAppSelector((state) => state.auth.token);
  const { data: huntersData } = useFetchMyHuntersQuery(undefined, { skip: !token });
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability', { skip: !token });
  const mark2Unlocked =
    hackAbilityFeatures?.some((f: { id?: string; isUnlocked?: boolean }) => f.id === 'mark-2-bots' && f.isUnlocked) ??
    false;
  const choiceOptions = useMemo(() => buildAllChoices(mark2Unlocked), [mark2Unlocked]);

  /**
   * Bugbot: `useSaveBattlePresetMutation` exposes shared `isLoading`; passing it to every PresetEditor would disable all
   * SAVE buttons. We track `savingPresetIds` and pass `isSaving={!!savingPresetIds[preset.id]}` per editor.
   */
  const [savingPresetIds, setSavingPresetIds] = useState<Record<string, boolean>>({});
  const [saveBattlePreset] = useSaveBattlePresetMutation();
  const hasKaitoHunter = useMemo(
    () => (huntersData?.hunters ?? []).some((h) => h.hunterRosterId === BUG_HUNT_ROSTER_ID_KAITO),
    [huntersData?.hunters]
  );
  const handleSavePreset = useCallback(
    async (
      presetId: string,
      battalions: Record<string, PresetBattalionConfig>,
      hunterSlots: Partial<Record<'1' | '2' | '3', 'kaito_glitch'>>
    ) => {
      setSavingPresetIds((prev) => ({ ...prev, [presetId]: true }));
      try {
        await saveBattlePreset({ presetId, battalions, hunterSlots }).unwrap();
      } finally {
        setSavingPresetIds((prev) => {
          const next = { ...prev };
          delete next[presetId];
          return next;
        });
      }
    },
    [saveBattlePreset]
  );

  const { data, isLoading } = useGetBattlePresetsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.matrix} />
      </View>
    );
  }

  const presets = data.presets;
  const presetList = (['1', '2', '3'] as const)
    .map((id) => presets[id])
    .filter((p): p is PresetData => p != null);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.tabTitle, { color: colors.text.primary }]}>BATTLE PRESETS</Text>
      <Text style={[styles.tabSubtitle, { color: colors.text.primary + '88' }]}>
        Set your desired troop layout for each preset. These are goals — when applied, battalions fill with what you
        have available.
      </Text>
      {presetList.map((preset) =>
        preset.unlocked ? (
          <PresetEditor
            key={preset.id}
            preset={preset}
            colors={colors}
            choiceOptions={choiceOptions}
            hasKaitoHunter={hasKaitoHunter}
            onSavePreset={handleSavePreset}
            isSaving={!!savingPresetIds[preset.id]}
          />
        ) : (
          <LockedPreset key={preset.id} preset={preset} colors={colors} />
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 25 : 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  tabSubtitle: {
    fontSize: SIZING.font.small * 0.9,
    marginBottom: SIZING.spacing.md,
    lineHeight: 16,
  },
  presetCard: {
    borderWidth: 1,
    borderRadius: 6,
    padding: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.md,
  },
  lockedCard: {
    opacity: 0.6,
  },
  presetTitle: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  lockedText: {
    fontSize: SIZING.font.small * 0.9,
    marginBottom: 2,
  },
  lockedSubtext: {
    fontSize: SIZING.font.small * 0.8,
  },
  hunterSection: {
    marginBottom: SIZING.spacing.sm,
  },
  hunterSectionTitle: {
    fontSize: SIZING.font.small * 0.9,
    fontWeight: '700',
    marginBottom: 4,
  },
  hunterSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
  },
  battalionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
    gap: 4,
  },
  battalionLabel: {
    width: 18,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  botDropdown: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    minHeight: 36,
  },
  botDropdownText: {
    fontSize: Math.max(SIZING.font.small * 0.85, 11),
    fontWeight: '600',
  },
  botPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  botPickerContainer: {
    width: '100%',
    maxWidth: 320,
    maxHeight: '70%',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  botPickerScroll: {
    maxHeight: 320,
  },
  botPickerTitle: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  botPickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  botPickerOptionText: {
    fontSize: SIZING.font.small,
  },
  quantityInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'android' ? 2 : 4,
    fontSize: SIZING.font.small * 0.9,
    textAlign: 'right',
  },
  saveButton: {
    marginTop: SIZING.spacing.sm,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: SIZING.font.small,
  },
  saveMessage: {
    fontSize: SIZING.font.small * 0.85,
    textAlign: 'center',
    marginTop: 4,
  },
});
