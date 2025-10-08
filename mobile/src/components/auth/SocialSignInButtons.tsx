import React, { memo, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useAppDispatch } from '../../store/hooks';
import { googleSignIn, googleSignUp, appleSignIn, appleSignUp } from '../../store/slices/authSlice';
import { GOOGLE_AUTH_CONFIG } from '../../config/googleAuth';
import { appleAuth, AppleButton } from '@invertase/react-native-apple-authentication';
import { AppleSignInButton } from './AppleSignInButton';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING, styleGuide } from '../../styles/theme';

interface SocialSignInButtonsProps {
  isSignUp?: boolean;
}

export const SocialSignInButtons = memo(function SocialSignInButtons({ 
  isSignUp = false 
}: SocialSignInButtonsProps) {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false); // Additional race condition protection

  const handleAppleSignIn = useCallback(async () => {
    if (isProcessing || isProcessingRef.current) return;
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    // Enhanced logging for iOS 26.1 debugging
    console.log('Apple Sign In attempt started:', {
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Check if Apple Sign In is available first
      const isAvailable = appleAuth.isSupported;
      if (!isAvailable) {
        console.log('Apple Sign In not supported on this device');
        Alert.alert('Error', 'Apple Sign In is not available on this device');
        return;
      }
      
      // Modern Apple Sign In configuration for 2024-2025
      // This configuration should handle the email sharing prompt more smoothly
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        // Add nonce for better security and to avoid token reuse issues
        nonce: `risingpunk_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        // Add state parameter to help with flow management
        state: `state_${Date.now()}`,
      });

      const { identityToken, nonce, email, fullName, user } = appleAuthRequestResponse;
      
      if (identityToken) {
        if (isSignUp) {
          await dispatch(appleSignUp(identityToken)).unwrap();
        } else {
          await dispatch(appleSignIn(identityToken)).unwrap();
        }
      } else {
        Alert.alert('Error', 'Apple Sign-In failed. Please try again.');
      }
    } catch (error: any) {
      // Enhanced logging for iOS 26.1 debugging
      console.log('Apple Sign In Error Details:', {
        platform: Platform.OS,
        version: Platform.Version,
        errorCode: error.code,
        errorMessage: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Handle specific Apple Sign In errors more gracefully
      const errorCode = error.code !== undefined ? String(error.code) : '';
      const isUserCancellation = errorCode === '1001' || 
                                errorCode === '1002' || // iOS 26.1 specific
                                errorCode === '1003' || // Additional iOS 26.1 codes
                                error.message?.includes('cancelled') || 
                                error.message?.includes('canceled');
      
      if (isUserCancellation) {
        // Don't show error for user cancellation
        return;
      } else {
        // Show error for all other cases (including 1000 - unknown errors)
        Alert.alert('Error', `Apple Sign-In failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [dispatch, isSignUp]); // Removed isProcessing from dependencies to prevent race condition

  const handleGoogleSignIn = useCallback(async () => {
    if (isProcessing || isProcessingRef.current) return;

    setIsProcessing(true);
    isProcessingRef.current = true;
    try {
      // Configure Google Sign In
      const config = {
        webClientId: GOOGLE_AUTH_CONFIG.webClientId,
        iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
        forceCodeForRefreshToken: true, // Force account selection
      };
      
      GoogleSignin.configure(config);
      
      await GoogleSignin.hasPlayServices();
      
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.type === 'cancelled' || userInfo.data === null) {
        return;
      }
      
      const idToken = userInfo.data?.idToken;
      
      if (idToken) {
        if (isSignUp) {
          await dispatch(googleSignUp(idToken)).unwrap();
        } else {
          await dispatch(googleSignIn(idToken)).unwrap();
        }
      } else {
        throw new Error('No ID token received from Google');
      }
    } catch (error: any) {
      
      if (error.code !== 'SIGN_IN_CANCELLED' && error.code !== 'IN_PROGRESS') {
        throw error;
      } else {
      }
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [dispatch, isSignUp]); // Removed isProcessing from dependencies to prevent race condition

  const showSignInOptions = useCallback(() => {
    Alert.alert(
      'ALTERNATIVE_SIGN_IN',
      'Choose your preferred sign-in method:',
      [
        {
          text: 'Apple',
          onPress: handleAppleSignIn,
          style: 'default',
        },
        {
          text: 'Google',
          onPress: handleGoogleSignIn,
          style: 'default',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }, [handleAppleSignIn, handleGoogleSignIn]);

  return (
    <View style={styles.container}>
      <View style={styles.logosContainer}>
        <View style={styles.googleButtonContainer}>
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Standard}
            color={GoogleSigninButton.Color.Dark}
            style={styles.googleButtonInner}
            onPress={handleGoogleSignIn}
          />
        </View>
        <View style={styles.appleButtonContainer}>
          <AppleSignInButton
            onPress={handleAppleSignIn}
            style={styles.appleButtonInner}
            isSignUp={isSignUp}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.sm,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    // Ensure minimum margin around buttons (1/10 of button height = 4.8pt for 48pt button)
    paddingHorizontal: Math.max(5, 48 * 0.1), // At least 5pt, or 1/10 of button height
  },
  logosContainer: {
    flexDirection: 'row',
    height: 48, // Increased container height to accommodate Google button
    position: 'relative',
  },
  googleButtonContainer: {
    width: 160,
    height: 48, // Match the parent container height
    position: 'absolute',
    left: 0,
    top: 0, // Force to same top position as Apple button
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonInner: {
    width: 160,
    height: 48, // Match container height
    // Removed scale transform to match Apple button height
  },
  appleButtonContainer: {
    width: 160,
    height: 48, // Match the parent container height
    position: 'absolute',
    right: 0,
    top: 0, // Force to same top position as Google button
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleButtonInner: {
    width: 160,
    height: 41, // Match container height
  },
  appleButton: {
    width: 160,
    height: 48, // Match container height
    minWidth: 160,
    maxWidth: 160,
    minHeight: 48,
    maxHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
