import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SIZING } from '../../../styles/theme';

type Props = {
  quantity: number;
  available: number;
  onChangeQuantity: (value: number) => void;
};

const MAX_BATTALION_SIZE = 250;

export const QuantitySelector = React.memo(({ quantity, available, onChangeQuantity }: Props) => {
  const maxQuantity = Math.min(available, MAX_BATTALION_SIZE);

  const adjustQuantity = (adjustment: number) => {
    const newValue = Math.min(Math.max(0, quantity + adjustment), maxQuantity);
    onChangeQuantity(newValue);
  };

  const handleDirectInput = (text: string) => {
    const value = parseInt(text) || 0;
    onChangeQuantity(Math.min(Math.max(0, value), maxQuantity));
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Quantity:</Text>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => adjustQuantity(-25)}
          >
            <Text style={styles.buttonText}>-25</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => adjustQuantity(-1)}
          >
            <Text style={styles.buttonText}>-1</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={quantity.toString()}
            onChangeText={handleDirectInput}
            keyboardType="number-pad"
            maxLength={3}
          />

          <TouchableOpacity 
            style={styles.button}
            onPress={() => adjustQuantity(1)}
          >
            <Text style={styles.buttonText}>+1</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => adjustQuantity(25)}
          >
            <Text style={styles.buttonText}>+25</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>Available: {available}</Text>
        <Text style={styles.infoText}>Max: {maxQuantity}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: SIZING.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZING.spacing.lg,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginRight: SIZING.spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    gap: SIZING.spacing.xs,
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#4717F6',
    borderRadius: 4,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.xs,
  },
  buttonText: {
    color: '#4717F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#4717F6',
    borderRadius: 4,
    color: '#4717F6',
    width: 60,
    height: 32,
    textAlign: 'center',
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZING.spacing.lg,
    paddingHorizontal: SIZING.spacing.sm,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
}); 