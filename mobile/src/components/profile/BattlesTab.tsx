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
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import {
  useGetBattlePresetsQuery,
  useSaveBattlePresetMutation,
  type PresetBattalionConfig,
  type PresetData,
} from '../../store/api/battlePresetsApi';

const BATTALION_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
type BotType = 'breacher' | 'guardian' | 'phreak';

/** Bots available for preset selection. Type label (Sprint/Brute/Remote) + display name. Future Mark II–IV add more entries per type. */
const PRESET_BOT_OPTIONS: { botType: BotType; typeLabel: string; name: string }[] = [
  { botType: 'guardian', typeLabel: 'Sprint', name: 'Guardian' },
  { botType: 'breacher', typeLabel: 'Brute', name: 'Breacher' },
  { botType: 'phreak', typeLabel: 'Remote', name: 'Phreak' },
];

interface PresetEditorProps {
  preset: PresetData;
  colors: any;
}

const PresetEditor = React.memo(({ preset, colors }: PresetEditorProps) => {
  const [saveBattlePreset, { isLoading: isSaving }] = useSaveBattlePresetMutation();

  const initialBattalions = useCallback((): Record<string, { botType: string; quantity: string }> => {
    const result: Record<string, { botType: string; quantity: string }> = {};
    for (const id of BATTALION_IDS) {
      const existing = preset.battalions?.[id];
      result[id] = {
        botType: existing?.botType ?? 'breacher',
        quantity: existing?.quantity != null ? String(existing.quantity) : '',
      };
    }
    return result;
  }, [preset.battalions]);

  const serverBattalionsSig = useMemo(
    () => JSON.stringify(preset.battalions ?? {}),
    [preset.battalions]
  );

  const [battalions, setBattalions] = useState(() => initialBattalions());

  useEffect(() => {
    setBattalions(initialBattalions());
  }, [preset.id, serverBattalionsSig, initialBattalions]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [openBotPickerForRow, setOpenBotPickerForRow] = useState<string | null>(null);

  const handleBotTypeChange = useCallback((battalionId: string, botType: string) => {
    setBattalions(prev => ({
      ...prev,
      [battalionId]: { ...prev[battalionId], botType },
    }));
    setSaveMessage(null);
    setOpenBotPickerForRow(null);
  }, []);

  const currentBotOption = (botType: string) =>
    PRESET_BOT_OPTIONS.find(o => o.botType === botType) ?? PRESET_BOT_OPTIONS[0];

  const handleQuantityChange = useCallback((battalionId: string, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setBattalions(prev => ({
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
        payload[id] = { botType: config.botType as any, quantity: qty };
      }
    }

    if (Object.keys(payload).length === 0) {
      setSaveMessage('Configure at least one battalion.');
      return;
    }

    try {
      await saveBattlePreset({ presetId: preset.id, battalions: payload }).unwrap();
      setSaveMessage('Saved.');
    } catch {
      setSaveMessage('Failed to save.');
    }
  }, [battalions, preset.id, saveBattlePreset]);

  return (
    <View style={[styles.presetCard, { borderColor: colors.matrix + '33' }]}>
      <Text style={[styles.presetTitle, { color: colors.matrix }]}>PRESET {preset.id}</Text>
      {BATTALION_IDS.map(id => {
        const config = battalions[id];
        const option = currentBotOption(config.botType);
        return (
          <View key={id} style={styles.battalionRow}>
            <Text style={[styles.battalionLabel, { color: colors.text.primary }]}>
              {id}
            </Text>
            <TouchableOpacity
              style={[styles.botDropdown, { borderColor: colors.matrix + '44' }]}
              onPress={() => setOpenBotPickerForRow(id)}
            >
              <Text style={[styles.botDropdownText, { color: colors.text.primary }]}>
                {option.name} ({option.typeLabel})
              </Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.quantityInput, { color: colors.text.primary, borderColor: colors.matrix + '44' }]}
              value={config.quantity}
              onChangeText={(text) => handleQuantityChange(id, text)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.text.primary + '44'}
              maxLength={7}
            />
          </View>
        );
      })}
      <Modal
        visible={openBotPickerForRow != null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenBotPickerForRow(null)}
        supportedOrientations={['landscape-left', 'landscape-right']}
      >
        <TouchableOpacity
          style={styles.botPickerOverlay}
          activeOpacity={1}
          onPress={() => setOpenBotPickerForRow(null)}
        >
          <View style={[styles.botPickerContainer, { backgroundColor: colors.surface, borderColor: colors.matrix + '44' }]}>
            <Text style={[styles.botPickerTitle, { color: colors.text.primary }]}>Select bot</Text>
            {PRESET_BOT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.botType}
                style={[
                  styles.botPickerOption,
                  { borderBottomColor: colors.text.primary + '22' },
                  openBotPickerForRow && battalions[openBotPickerForRow]?.botType === opt.botType && { backgroundColor: colors.matrix + '22' },
                ]}
                onPress={() => openBotPickerForRow && handleBotTypeChange(openBotPickerForRow, opt.botType)}
              >
                <Text style={[styles.botPickerOptionText, { color: colors.text.primary }]}>
                  {opt.name} ({opt.typeLabel})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
    <Text style={[styles.lockedSubtext, { color: colors.text.primary + '44' }]}>
      Unlock on Battle screen
    </Text>
  </View>
));

export function BattlesTab(): React.JSX.Element {
  const colors = useThemeColors();
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
  const presetList = ['1', '2', '3'].map(id => presets[id]);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.tabTitle, { color: colors.text.primary }]}>BATTLE PRESETS</Text>
      <Text style={[styles.tabSubtitle, { color: colors.text.primary + '88' }]}>
        Set your desired troop layout for each preset. These are goals — when applied, battalions fill with what you have available.
      </Text>
      {presetList.map(preset => (
        preset.unlocked ? (
          <PresetEditor key={preset.id} preset={preset} colors={colors} />
        ) : (
          <LockedPreset key={preset.id} preset={preset} colors={colors} />
        )
      ))}
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
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
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
