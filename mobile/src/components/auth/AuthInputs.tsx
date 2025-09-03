import React, { memo, useRef } from 'react';
import { View, TextInput } from 'react-native';
import { KeyboardAwareInput } from '../common/KeyboardAwareInput';
import { KeyboardDismissView } from '../common/KeyboardDismissView';

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
  const accessKeyRef = useRef<TextInput>(null);
  const verifyAccessKeyRef = useRef<TextInput>(null);

  const focusNext = (nextRef: React.RefObject<TextInput>) => {
    if (nextRef.current) {
      nextRef.current.focus();
    }
  };

  if (formType === 'login') {
    return (
      <KeyboardDismissView>
        <View>
        <KeyboardAwareInput
          placeholder="HANDLE (USERNAME)"
          value={formData.handle}
          onChangeText={handleInputChange('handle')}
          onSubmitEditing={() => focusNext(accessKeyRef)}
        />
        <KeyboardAwareInput
          ref={accessKeyRef}
          placeholder="KEY (PWD)"
          value={formData.accessKey}
          onChangeText={handleInputChange('accessKey')}
          secureTextEntry={true}
          isLastInput={true}
        />
        </View>
      </KeyboardDismissView>
    );
  }

  return (
    <KeyboardDismissView>
      <View>
        <KeyboardAwareInput
          placeholder="ENTER_EMAIL"
          value={formData.email}
          onChangeText={handleInputChange('email')}
          keyboardType="email-address"
          onSubmitEditing={() => focusNext(accessKeyRef)}
        />
        <KeyboardAwareInput
          ref={accessKeyRef}
          placeholder="SET_KEY (CREATE PWD)"
          value={formData.accessKey}
          onChangeText={handleInputChange('accessKey')}
          secureTextEntry={true}
          onSubmitEditing={() => focusNext(verifyAccessKeyRef)}
        />
        <KeyboardAwareInput
          ref={verifyAccessKeyRef}
          placeholder="VERIFY_KEY"
          value={formData.verifyAccessKey}
          onChangeText={handleInputChange('verifyAccessKey')}
          secureTextEntry={true}
          isLastInput={true}
        />
      </View>
    </KeyboardDismissView>
  );
});
