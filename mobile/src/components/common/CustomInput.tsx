import React from 'react';
import { KeyboardAwareInput, KeyboardAwareInputProps } from './KeyboardAwareInput';

interface CustomInputProps extends KeyboardAwareInputProps {
  // Add any additional props we might need
}

export const CustomInput: React.FC<CustomInputProps> = (props) => {
  return <KeyboardAwareInput {...props} />;
};
