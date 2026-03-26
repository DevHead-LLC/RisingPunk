import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  Keyboard,
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

/** Dev-only: grep Metro for `[RP-BattlesFocus]` — see taskItems/problemSolvingTempFile.md */
function battlesFocusLog(...args: unknown[]): void {
  if (!__DEV__) return;
  console.log('[RP-BattlesFocus]', ...args);
}

/** Quantity fields use `number-pad` on both platforms (inline `TextInput`). */
const QUANTITY_KEYBOARD = 'number-pad' as const;

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
  onSavePreset: (presetId: string, battalions: Record<string, PresetBattalionConfig>) => Promise<void>;
  isSaving: boolean;
}

/** Must match landscape-only `UISupportedInterfaceOrientations` in Info.plist. */
const MODAL_LANDSCAPE_ORIENTATIONS = ['landscape-left', 'landscape-right'] as const;

const PresetEditor = React.memo(({ preset, colors, choiceOptions, onSavePreset, isSaving }: PresetEditorProps) => {
  const syncDiagCountRef = useRef(0);
  const firstChangeLoggedRef = useRef<Set<string>>(new Set());
  const layoutLoggedRef = useRef<Set<string>>(new Set());

  const serverBattalionsSig = useMemo(
    () => JSON.stringify(preset.battalions ?? {}),
    [preset.battalions]
  );

  const [battalions, setBattalions] = useState(() =>
    buildInitialBattalions(preset.battalions, choiceOptions)
  );

  useEffect(() => {
    if (__DEV__ && syncDiagCountRef.current < 16) {
      syncDiagCountRef.current += 1;
      battlesFocusLog('sync effect', { presetId: preset.id, n: syncDiagCountRef.current, sigLen: serverBattalionsSig.length });
    }
    setBattalions(buildInitialBattalions(battalionsFromSig(serverBattalionsSig), choiceOptions));
  }, [preset.id, serverBattalionsSig, choiceOptions]);
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
      battlesFocusLog('ActionSheet open request', { presetId: preset.id, rowId, optionCount: choiceOptions.length });
      const labels = choiceOptions.map((o) => o.label);
      const cancelIndex = labels.length;
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, 'Cancel'],
          cancelButtonIndex: cancelIndex,
        },
        (buttonIndex) => {
          battlesFocusLog('ActionSheet callback', { presetId: preset.id, rowId, buttonIndex, cancelIndex });
          if (buttonIndex === cancelIndex) return;
          const opt = choiceOptions[buttonIndex];
          if (opt) {
            handleChoiceKeyChange(rowId, choiceKey(opt.botType, opt.markLevel));
          }
        }
      );
    },
    [choiceOptions, handleChoiceKeyChange, preset.id]
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

    if (Object.keys(payload).length === 0) {
      setSaveMessage('Configure at least one battalion.');
      return;
    }

    try {
      await onSavePreset(preset.id, payload);
      setSaveMessage('Saved.');
    } catch {
      setSaveMessage('Failed to save.');
    }
  }, [battalions, preset.id, onSavePreset]);

  return (
    <View style={[styles.presetCard, { borderColor: colors.matrix + '33' }]}>
      <Text style={[styles.presetTitle, { color: colors.matrix }]}>PRESET {preset.id}</Text>
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
                { color: colors.text.primary, borderColor: colors.matrix + '44', textAlign: 'right' },
              ]}
              value={config.quantity}
              onChangeText={(text) => {
                const rowKey = `${preset.id}:${id}`;
                if (__DEV__ && !firstChangeLoggedRef.current.has(rowKey)) {
                  firstChangeLoggedRef.current.add(rowKey);
                  battlesFocusLog('TextInput first onChangeText', { presetId: preset.id, rowId: id, platform: Platform.OS });
                }
                handleQuantityChange(id, text);
              }}
              onPressIn={() => {
                const t = Date.now();
                battlesFocusLog('qty TextInput onPressIn', { presetId: preset.id, rowId: id, platform: Platform.OS, t });
                setTimeout(() => {
                  battlesFocusLog('qty TextInput setTimeout(250) after onPressIn', {
                    presetId: preset.id,
                    rowId: id,
                    dt: Date.now() - t,
                  });
                }, 250);
              }}
              onLayout={(e) => {
                const lk = `${preset.id}:${id}`;
                if (__DEV__ && !layoutLoggedRef.current.has(lk)) {
                  layoutLoggedRef.current.add(lk);
                  battlesFocusLog('TextInput onLayout (once/row)', {
                    presetId: preset.id,
                    rowId: id,
                    w: e.nativeEvent.layout.width,
                    h: e.nativeEvent.layout.height,
                  });
                }
              }}
              onFocus={() => {
                const t = Date.now();
                battlesFocusLog('qty TextInput onFocus ENTRY', { presetId: preset.id, rowId: id, platform: Platform.OS, t });
                queueMicrotask(() => {
                  battlesFocusLog('qty TextInput onFocus → queueMicrotask (JS still scheduling)', {
                    presetId: preset.id,
                    rowId: id,
                    dt: Date.now() - t,
                  });
                });
                setTimeout(() => {
                  battlesFocusLog('qty TextInput onFocus → setTimeout(0)', { presetId: preset.id, rowId: id, dt: Date.now() - t });
                }, 0);
              }}
              onBlur={() => {
                battlesFocusLog('qty TextInput onBlur', { presetId: preset.id, rowId: id, platform: Platform.OS, t: Date.now() });
              }}
              keyboardType={QUANTITY_KEYBOARD}
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
          onShow={() => {
            battlesFocusLog('Android Modal onShow', { presetId: preset.id });
          }}
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
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability', { skip: !token });
  const mark2Unlocked =
    hackAbilityFeatures?.some((f: { id?: string; isUnlocked?: boolean }) => f.id === 'mark-2-bots' && f.isUnlocked) ??
    false;
  const choiceOptions = useMemo(() => buildAllChoices(mark2Unlocked), [mark2Unlocked]);

  const [saveBattlePreset, { isLoading: isSaving }] = useSaveBattlePresetMutation();
  const handleSavePreset = useCallback(
    async (presetId: string, battalions: Record<string, PresetBattalionConfig>) => {
      battlesFocusLog('saveBattlePreset mutation (parent)', { presetId, ts: Date.now() });
      await saveBattlePreset({ presetId, battalions }).unwrap();
    },
    [saveBattlePreset]
  );

  const { data, isLoading } = useGetBattlePresetsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!__DEV__) return;
    battlesFocusLog('BattlesTab mount');
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, (e) => {
      battlesFocusLog('Keyboard event', showEvt, { height: e.endCoordinates?.height, duration: e.duration });
    });
    const subHide = Keyboard.addListener(hideEvt, () => {
      battlesFocusLog('Keyboard event', hideEvt);
    });
    return () => {
      battlesFocusLog('BattlesTab unmount');
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!__DEV__ || !data) return;
    battlesFocusLog('BattlesTab presets ready', {
      mark2Unlocked,
      choiceOptionCount: choiceOptions.length,
      presetKeys: Object.keys(data.presets ?? {}),
    });
  }, [data, mark2Unlocked, choiceOptions.length]);

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
              onSavePreset={handleSavePreset}
              isSaving={isSaving}
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
    justifyContent: 'center',
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
