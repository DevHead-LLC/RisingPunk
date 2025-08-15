import React, { memo, useRef } from 'react';
import { View, TextInput } from 'react-native';
import { KeyboardAwareInput } from '../common/KeyboardAwareInput';

interface AuthInputsProps {
  formType: 'login' | 'register';
  formData: {
    email: string;
    handle: string;
    accessKey: string;
    verifyAccessKey: string;
  };
  handleInputChange: (field: string) => (value: string) => void;
}

export const AuthInputs = memo(function AuthInputs({
  formType,
  formData,
  handleInputChange,
}: AuthInputsProps) {
  const handleRef = useRef<TextInput>(null);
  const accessKeyRef = useRef<TextInput>(null);
  const verifyAccessKeyRef = useRef<TextInput>(null);

  if (formType === 'login') {
    return (
      <View>
        <KeyboardAwareInput
          placeholder="HANDLE"
          value={formData.handle}
          onChangeText={handleInputChange('handle')}
          onSubmitEditing={() => accessKeyRef.current?.focus()}
        />
        <KeyboardAwareInput
          ref={accessKeyRef}
          placeholder="ACCESS_KEY"
          value={formData.accessKey}
          onChangeText={handleInputChange('accessKey')}
          secureTextEntry={true}
          isLastInput={true}
        />
      </View>
    );
  }

  return (
    <View>
      <KeyboardAwareInput
        placeholder="ENTER_EMAIL"
        value={formData.email}
        onChangeText={handleInputChange('email')}
        keyboardType="email-address"
        onSubmitEditing={() => handleRef.current?.focus()}
      />
      <KeyboardAwareInput
        ref={handleRef}
        placeholder="SELECT_HANDLE"
        value={formData.handle}
        onChangeText={handleInputChange('handle')}
        onSubmitEditing={() => accessKeyRef.current?.focus()}
      />
      <KeyboardAwareInput
        ref={accessKeyRef}
        placeholder="SET_ACCESS_KEY"
        value={formData.accessKey}
        onChangeText={handleInputChange('accessKey')}
        secureTextEntry={true}
        onSubmitEditing={() => verifyAccessKeyRef.current?.focus()}
      />
      <KeyboardAwareInput
        ref={verifyAccessKeyRef}
        placeholder="VERIFY_ACCESS_KEY"
        value={formData.verifyAccessKey}
        onChangeText={handleInputChange('verifyAccessKey')}
        secureTextEntry={true}
        isLastInput={true}
      />
    </View>
  );
});
