import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SIZING } from '../../../styles/theme';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useTheme } from '../../../context/ThemeContext';
import { KeyboardAwareInput } from '../../common/KeyboardAwareInput';
import { useGetUserFeaturesQuery } from '../../../store/api/researchFeaturesApi';

type Props = {
  quantity: number;
  available: number;
  onChangeQuantity: (value: number) => void;
  disabled?: boolean;
};

export const QuantitySelector = React.memo(({ quantity, available, onChangeQuantity, disabled = false }: Props) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const { data: hackAbilityFeatures } = useGetUserFeaturesQuery('hack-ability');

  const battalionSizeFeature = React.useMemo(() => {
    return hackAbilityFeatures?.find(f => f.id === 'increase-battalion-size');
  }, [hackAbilityFeatures]);

  const isUnlocked = React.useMemo(() => {
    if (!battalionSizeFeature) return false;
    const now = new Date().getTime();
    const researchCompletesAt = battalionSizeFeature.researchCompletesAt 
      ? new Date(battalionSizeFeature.researchCompletesAt).getTime() 
      : 0;
    const remaining = Math.max(0, researchCompletesAt - now);
    return battalionSizeFeature.isUnlocked || 
      (battalionSizeFeature.isResearching && remaining === 0);
  }, [battalionSizeFeature?.isUnlocked, battalionSizeFeature?.isResearching, battalionSizeFeature?.researchCompletesAt]);

  const MAX_BATTALION_SIZE = isUnlocked ? 500 : 250;
  const maxQuantity = Math.min(available, MAX_BATTALION_SIZE);

  const adjustQuantity = React.useCallback((adjustment: number) => {
    const newValue = Math.min(Math.max(0, quantity + adjustment), maxQuantity);
    onChangeQuantity(newValue);
  }, [quantity, maxQuantity, onChangeQuantity]);

  const handleDirectInput = React.useCallback((text: string) => {
    if (disabled) return;
    const value = parseInt(text) || 0;
    onChangeQuantity(Math.min(Math.max(0, value), maxQuantity));
  }, [maxQuantity, onChangeQuantity, disabled]);

  const handleMaxQuantity = React.useCallback(() => {
    if (
      typeof maxQuantity !== 'number' ||
      !Number.isFinite(maxQuantity) ||
      maxQuantity < 0 ||
      maxQuantity > MAX_BATTALION_SIZE
    ) {
      return;
    }
    
    const safeValue = Math.min(Math.max(0, maxQuantity), MAX_BATTALION_SIZE);
    onChangeQuantity(safeValue);
  }, [maxQuantity, onChangeQuantity]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>Quantity:</Text>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.button, { 
              backgroundColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.15)' : 'rgba(71, 23, 246, 0.1)',
              borderColor: colors.secondary,
              opacity: disabled ? 0.5 : 1
            }]}
            onPress={() => adjustQuantity(-25)}
            disabled={disabled}
          >
            <Text style={[styles.buttonText, { color: colors.secondary }]}>-25</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { 
              backgroundColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.15)' : 'rgba(71, 23, 246, 0.1)',
              borderColor: colors.secondary,
              opacity: disabled ? 0.5 : 1
            }]}
            onPress={() => adjustQuantity(-1)}
            disabled={disabled}
          >
            <Text style={[styles.buttonText, { color: colors.secondary }]}>-1</Text>
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <KeyboardAwareInput
              value={quantity.toString()}
              onChangeText={handleDirectInput}
              keyboardType="numeric"
              style={[styles.input, { 
                backgroundColor: themeMode === 'light' ? 'rgba(248, 246, 240, 0.8)' : 'rgba(0, 0, 0, 0.3)',
                borderColor: colors.secondary,
                color: colors.secondary,
                opacity: disabled ? 0.5 : 1
              }]}
              containerStyle={styles.inputContainer}
              isLastInput={true}
              maxLength={3}
              editable={!disabled}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { 
              backgroundColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.15)' : 'rgba(71, 23, 246, 0.1)',
              borderColor: colors.secondary,
              opacity: disabled ? 0.5 : 1
            }]}
            onPress={() => adjustQuantity(1)}
            disabled={disabled}
          >
            <Text style={[styles.buttonText, { color: colors.secondary }]}>+1</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { 
              backgroundColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.15)' : 'rgba(71, 23, 246, 0.1)',
              borderColor: colors.secondary,
              opacity: disabled ? 0.5 : 1
            }]}
            onPress={() => adjustQuantity(25)}
            disabled={disabled}
          >
            <Text style={[styles.buttonText, { color: colors.secondary }]}>+25</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { 
              backgroundColor: themeMode === 'light' ? 'rgba(71, 23, 246, 0.15)' : 'rgba(71, 23, 246, 0.1)',
              borderColor: colors.secondary,
              opacity: disabled ? 0.5 : 1
            }]}
            onPress={handleMaxQuantity}
            disabled={disabled}
          >
            <Text style={[styles.buttonText, { color: colors.secondary }]}>MAX</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={[styles.infoText, { color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)' }]}>Available: {available}</Text>
        <Text style={[styles.infoText, { color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)' }]}>Max: {maxQuantity}</Text>
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
    fontSize: 16,
    marginRight: SIZING.spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    gap: SIZING.spacing.xs,
    alignItems: 'center',
  },
  button: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.xs,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputWrapper: {
    ...(Platform.OS === 'android' && {
      justifyContent: 'center',
      alignItems: 'center',
    }),
  },
  inputContainer: {
    marginBottom: 0,
    ...(Platform.OS === 'android' && {
      height: 32,
      justifyContent: 'center',
    }),
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    width: 60,
    height: 32,
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: 0,
    ...(Platform.OS === 'android' && {
      paddingVertical: 0,
    }),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SIZING.spacing.lg,
    paddingHorizontal: SIZING.spacing.sm,
  },
  infoText: {
    fontSize: 14,
  },
});
