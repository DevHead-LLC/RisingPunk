import React from 'react';
import { View, TextInput } from 'react-native';
import { COLORS } from '../styles/theme';

export function renderInputWithCorner(
  placeholder: string,
  value: string,
  onChangeText: (text: string) => void,
  secureTextEntry?: boolean,
  keyboardType: 'email-address' | 'default' = 'default'
) {
  return (
    <View style={{ position: 'relative', marginBottom: 8 }}>
      <TextInput
        style={{
          height: 42,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          color: COLORS.text.primary,
          paddingHorizontal: 12,
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      <View style={{
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 10,
        height: 10,
        borderColor: COLORS.primary,
        borderRightWidth: 2,
        borderBottomWidth: 2,
      }} />
    </View>
  );
}
