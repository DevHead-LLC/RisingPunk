import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BotType } from '../../types/bots';
import { KeyboardAwareInput } from '../common/KeyboardAwareInput';
import { KeyboardDismissView } from '../common/KeyboardDismissView';

type BuildControlsProps = {
  selectedType: BotType | null;
  buildingProgress: number | null;
  quantity: string;
  onQuantityChange: (value: string) => void;
  onBuild: () => void;
  onSpeedup?: () => void;
};

export const BuildControls = React.memo(function BuildControls({
  selectedType,
  buildingProgress,
  quantity,
  onQuantityChange,
  onBuild,
  onSpeedup,
}: BuildControlsProps) {
  const colors = useThemeColors();

  // If build is in progress, show speedup button instead of input/build button
  if (buildingProgress !== null && onSpeedup) {
    return (
      <KeyboardDismissView>
        <TouchableOpacity
          style={[
            styles.speedupButton,
            {
              backgroundColor: colors.matrix,
              borderColor: colors.matrix,
            },
          ]}
          onPress={onSpeedup}
        >
          <Text style={[styles.speedupButtonText, { color: colors.background }]}>
            COMPLETE BUILD
          </Text>
        </TouchableOpacity>
      </KeyboardDismissView>
    );
  }

  return (
    <KeyboardDismissView>
      <View style={styles.buildControlsRow}>
        <KeyboardAwareInput
          placeholder="Qty"
          value={quantity}
          onChangeText={onQuantityChange}
          keyboardType="numeric"
          style={[styles.quantityInput, {
            backgroundColor: colors.accent + '30',
            borderColor: colors.matrix + '40',
            color: colors.text.primary,
          }]}
          containerStyle={styles.quantityInputContainer}
          editable={buildingProgress === null}
          isLastInput={true}
          onSubmitEditing={onBuild}
        />
        <TouchableOpacity
          style={[
            styles.buildButton,
            {
              backgroundColor: colors.accent + '30',
              borderColor: colors.matrix + '40',
            },
            (!selectedType || buildingProgress !== null) && [styles.buildButtonDisabled, {
              backgroundColor: colors.accent + '40',
            }],
          ]}
          onPress={onBuild}
          disabled={!selectedType || buildingProgress !== null}
        >
          <Text style={[styles.buildButtonText, { color: colors.text.primary }]}>BUILD</Text>
        </TouchableOpacity>
      </View>
    </KeyboardDismissView>
  );
});

const styles = StyleSheet.create({
  buildControlsRow: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
  },
  quantityInput: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: SIZING.font.body,
    ...(Platform.OS === 'android' && {
      height: 48,
      paddingHorizontal: SIZING.spacing.lg,
      paddingVertical: 0,
      lineHeight: SIZING.font.body,
    }),
  },
  quantityInputContainer: {
    flex: 1,
  },
  buildButton: {
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
  },
  buildButtonDisabled: {
    opacity: 0.5,
  },
  buildButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buildTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  button: {
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  speedupButton: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: SIZING.spacing.xs,
    ...(Platform.OS === 'android' && {
      height: 48,
    }),
  },
  speedupButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
