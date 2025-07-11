import React, { memo } from 'react';
import { View } from 'react-native';
import { renderInputWithCorner } from '../../utils/renderInputWithCorner';

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
  if (formType === 'login') {
    return (
      <View>
        {renderInputWithCorner('HANDLE', formData.handle, handleInputChange('handle'))}
        {renderInputWithCorner('ACCESS_KEY', formData.accessKey, handleInputChange('accessKey'), true)}
      </View>
    );
  }

  return (
    <View>
      {renderInputWithCorner('ENTER_EMAIL', formData.email, handleInputChange('email'), false, 'email-address')}
      {renderInputWithCorner('SELECT_HANDLE', formData.handle, handleInputChange('handle'))}
      {renderInputWithCorner('SET_ACCESS_KEY', formData.accessKey, handleInputChange('accessKey'), true)}
      {renderInputWithCorner('VERIFY_ACCESS_KEY', formData.verifyAccessKey, handleInputChange('verifyAccessKey'), true)}
    </View>
  );
});
