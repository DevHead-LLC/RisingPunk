import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';
import { BotType } from '../../types/bots';

type BuildControlsProps = {
  selectedType: BotType | null;
  buildingProgress: number | null;
  quantity: string;
  onQuantityChange: (value: string) => void;
  onBuild: () => void;
};

export const BuildControls = React.memo(function BuildControls({
  selectedType,
  buildingProgress,
  quantity,
  onQuantityChange,
  onBuild,
}: BuildControlsProps) {
  return (
    <View style={styles.buildControlsRow}>
      <TextInput
        style={styles.quantityInput}
        value={quantity}
        onChangeText={onQuantityChange}
        keyboardType="numeric"
        placeholder="Qty"
        placeholderTextColor="rgba(255, 255, 255, 0.4)"
        editable={buildingProgress === null}
      />
      <TouchableOpacity
        style={[
          styles.buildButton,
          (!selectedType || buildingProgress !== null) && styles.buildButtonDisabled,
        ]}
        onPress={onBuild}
        disabled={!selectedType || buildingProgress !== null}
      >
        <Text style={styles.buildButtonText}>BUILD</Text>
      </TouchableOpacity>
    </View>
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
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
    color: COLORS.text.primary,
    textAlign: 'center',
    fontSize: SIZING.font.body,
  },
  buildButton: {
    width: 80,
    height: 40,
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
  },
  buildButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(26, 77, 51, 0.4)',
  },
  buildButtonText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buildTitle: {
    color: '#4717F6',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  button: {
    width: 80,
    height: 40,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
  },
  buttonText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
