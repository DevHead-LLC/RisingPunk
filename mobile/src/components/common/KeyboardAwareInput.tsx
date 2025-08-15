import React, { forwardRef } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { COLORS } from '../../styles/theme';

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
  isLastInput?: boolean;
  editable?: boolean;
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
      isLastInput = false,
      editable = true,
    },
    ref
  ) {
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
      <View style={styles.container}>
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={getReturnKeyType()}
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          editable={editable}
        />
        <View style={styles.corner} />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 8,
  },
  input: {
    height: 42,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: COLORS.text.primary,
    paddingHorizontal: 12,
  },
  corner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderColor: COLORS.primary,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
});
