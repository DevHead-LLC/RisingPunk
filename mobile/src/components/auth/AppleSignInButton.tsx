import React, { memo } from 'react';
import { Platform, View } from 'react-native';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { useTheme } from '../../context/ThemeContext';

interface AppleSignInButtonProps {
  onPress: () => void;
  style?: any;
  isSignUp?: boolean;
}

export const AppleSignInButton = memo(function AppleSignInButton({ 
  onPress, 
  style,
  isSignUp = false
}: AppleSignInButtonProps) {
  const { themeMode } = useTheme();
  
  if (Platform.OS !== 'ios') {
    return null; // Apple Sign In only available on iOS
  }

  // Use WHITE style for dark backgrounds, BLACK style for light backgrounds
  // This follows Apple's Human Interface Guidelines for proper contrast
  const buttonStyle = themeMode === 'dark' ? AppleButton.Style.WHITE : AppleButton.Style.BLACK;
  
  // Use appropriate button type based on context
  const buttonType = isSignUp ? AppleButton.Type.SIGN_UP : AppleButton.Type.SIGN_IN;

  return (
    <AppleButton
      buttonStyle={buttonStyle}
      buttonType={buttonType}
      style={[styles.appleButton, style]}
      onPress={onPress}
      // Accessibility is handled automatically by AppleButton component
      // It provides system-provided alternative text labels for VoiceOver
    />
  );
});

const styles = {
  appleButton: {
    width: 160, // Exceeds Apple's minimum of 140pt
    height: 48, // Exceeds Apple's minimum of 30pt and matches container height
    minWidth: 140, // Apple's minimum width requirement
    minHeight: 30, // Apple's minimum height requirement
  },
};