import React, { forwardRef } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { createThemeAwareStyleGuide } from '../../styles/theme';

export interface KeyboardAwareInputProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  returnKeyType?: 'next' | 'done' | 'go' | 'search' | 'send';
  onSubmitEditing?: () => void;
  blurOnSubmit?: boolean;
  style?: any;
  containerStyle?: any;
  isLastInput?: boolean;
  editable?: boolean;
  maxLength?: number;
}

export const KeyboardAwareInput = forwardRef<TextInput, KeyboardAwareInputProps>(
  function KeyboardAwareInput(
    {
      placeholder,
      value,
      onChangeText,
      secureTextEntry = false,
      keyboardType = 'default',
      autoCapitalize = 'none',
      returnKeyType,
      onSubmitEditing,
      blurOnSubmit = true,
      style,
      containerStyle,
      isLastInput = false,
      editable = true,
      maxLength,
    },
    ref
  ) {
    const colors = useThemeColors();
    const isLightMode = colors.background === '#F5F5DC'; // Check if light mode
    const themeStyles = createThemeAwareStyleGuide(isLightMode);

    const handleSubmitEditing = () => {
      if (onSubmitEditing) {
        onSubmitEditing();
      } else if (isLastInput) {
        Keyboard.dismiss();
      }
    };

    const getReturnKeyType = () => {
      if (returnKeyType) return returnKeyType;
      return isLastInput ? 'done' : 'next';
    };

    return (
      <View style={[styles.container, containerStyle]}>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              color: colors.text.primary,
              borderColor: isLightMode ? colors.primary + '60' : colors.buttonBg,
              borderWidth: isLightMode ? 2 : 1,
              borderRadius: isLightMode ? 6 : 0,
            },
            style
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.text.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={getReturnKeyType()}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          editable={editable}
          maxLength={maxLength}
        />
        <View style={[styles.corner, { borderColor: colors.primary }]} />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: SIZING.spacing.sm,
  },
  input: {
    height: 42,
    paddingHorizontal: SIZING.spacing.sm,
    fontSize: SIZING.font.body,
  },
  corner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
});
