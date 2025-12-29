import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Animated } from 'react-native';
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
  highlightQuantityInput?: boolean;
  highlightBuildButton?: boolean;
  highlightSpeedupButton?: boolean;
};

export const BuildControls = React.memo(function BuildControls({
  selectedType,
  buildingProgress,
  quantity,
  onQuantityChange,
  onBuild,
  onSpeedup,
  highlightQuantityInput = false,
  highlightBuildButton = false,
  highlightSpeedupButton = false,
}: BuildControlsProps) {
  const colors = useThemeColors();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new Animated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  const isAnyHighlighted = highlightQuantityInput || highlightBuildButton || highlightSpeedupButton;
  
  useEffect(() => {
    if (isAnyHighlighted) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % introColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isAnyHighlighted, introColors.length]);
  
  useEffect(() => {
    if (isAnyHighlighted) {
      Animated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isAnyHighlighted, animatedBorderColor]);
  
  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: introColors,
  });

  // If build is in progress, show speedup button instead of input/build button
  if (buildingProgress !== null && onSpeedup) {
    return (
      <KeyboardDismissView>
        <View style={{ zIndex: highlightSpeedupButton ? 1000 : 3 }}>
          <TouchableOpacity
            style={[
              styles.speedupButton,
              {
                backgroundColor: colors.matrix,
                borderColor: highlightSpeedupButton ? undefined : colors.matrix,
                borderWidth: highlightSpeedupButton ? 3 : 1,
                overflow: 'hidden',
              },
            ]}
            onPress={onSpeedup}
          >
            {highlightSpeedupButton && (
              <Animated.View 
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderWidth: 3,
                    borderColor: animatedBorderColorValue,
                    borderRadius: 4,
                  }
                ]} 
                pointerEvents="none"
              />
            )}
            <Text style={[styles.speedupButtonText, { color: colors.background }]}>
              COMPLETE BUILD
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardDismissView>
    );
  }

  return (
    <KeyboardDismissView>
      <View style={styles.buildControlsRow}>
        <View style={{ flex: 1, zIndex: highlightQuantityInput ? 1000 : 3, pointerEvents: highlightBuildButton ? 'none' : 'auto' }}>
          <KeyboardAwareInput
            placeholder="Qty"
            value={quantity}
            onChangeText={onQuantityChange}
            keyboardType="numeric"
            style={[styles.quantityInput, {
              backgroundColor: colors.accent + '30',
              borderColor: highlightQuantityInput ? undefined : colors.matrix + '40',
              color: colors.text.primary,
              borderWidth: highlightQuantityInput ? 3 : 1,
            }]}
            containerStyle={styles.quantityInputContainer}
            editable={buildingProgress === null && !highlightBuildButton}
            isLastInput={true}
            onSubmitEditing={onBuild}
          />
          {highlightQuantityInput && (
            <Animated.View 
              style={[
                StyleSheet.absoluteFill,
                {
                  borderWidth: 3,
                  borderColor: animatedBorderColorValue,
                  borderRadius: 4,
                  pointerEvents: 'none',
                }
              ]} 
            />
          )}
        </View>
        <View style={{ zIndex: highlightBuildButton ? 1000 : 3 }}>
          <TouchableOpacity
            style={[
              styles.buildButton,
              {
                backgroundColor: colors.accent + '30',
                borderColor: highlightBuildButton ? undefined : colors.matrix + '40',
                borderWidth: highlightBuildButton ? 3 : 1,
                overflow: 'hidden',
              },
              (!selectedType || buildingProgress !== null) && [styles.buildButtonDisabled, {
                backgroundColor: colors.accent + '40',
              }],
            ]}
            onPress={onBuild}
            disabled={!selectedType || buildingProgress !== null}
          >
            {highlightBuildButton && (
              <Animated.View 
                style={[
                  StyleSheet.absoluteFill,
                  {
                    borderWidth: 3,
                    borderColor: animatedBorderColorValue,
                    borderRadius: 4,
                  }
                ]} 
                pointerEvents="none"
              />
            )}
            <Text style={[styles.buildButtonText, { color: colors.text.primary }]}>BUILD</Text>
          </TouchableOpacity>
        </View>
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
