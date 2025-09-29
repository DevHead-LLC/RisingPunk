import React, { memo } from 'react';
import { Platform, View } from 'react-native';
import { AppleButton } from '@invertase/react-native-apple-authentication';

interface AppleSignInButtonProps {
  onPress: () => void;
  style?: any;
}

export const AppleSignInButton = memo(function AppleSignInButton({ 
  onPress, 
  style 
}: AppleSignInButtonProps) {
  if (Platform.OS !== 'ios') {
    return null; // Apple Sign In only available on iOS
  }

  return (
    <AppleButton
      buttonStyle={AppleButton.Style.BLACK}
      buttonType={AppleButton.Type.SIGN_IN}
      style={[styles.appleButton, style]}
      onPress={onPress}
    />
  );
});

const styles = {
  appleButton: {
    width: 160,
    height: 36,
  },
};