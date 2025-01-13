import React from 'react';
import {TextInput, TextInputProps, StyleSheet} from 'react-native';

interface CustomInputProps extends TextInputProps {
  // Add any additional props we might need
}

export const CustomInput: React.FC<CustomInputProps> = ({style, ...props}) => {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#666"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    width: 300,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
}); 