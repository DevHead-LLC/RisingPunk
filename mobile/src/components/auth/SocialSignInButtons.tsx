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
import { API_URL } from '../../config';
import { AuthAlertModal } from '../modals/AuthAlertModal';

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
  
  // Custom modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  const showCustomAlert = useCallback((title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalVisible(true);
  }, []);

  const hideCustomAlert = useCallback(() => {
    setModalVisible(false);
  }, []);

  const checkAppleAccountExists = async (appleUserId: string, identityToken: string): Promise<{exists: boolean}> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/check-apple-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appleId: appleUserId, identityToken }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking Apple account:', error);
      return { exists: false };
    }
  };

  const checkGoogleAccountExists = async (googleUserId: string, idToken: string): Promise<{exists: boolean}> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/check-google-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleId: googleUserId, idToken }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking Google account:', error);
      return { exists: false };
    }
  };

  const handleAppleSignIn = useCallback(async () => {
    if (isProcessing || isProcessingRef.current) return;
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    
    try {
      // Check if Apple Sign In is available first
      const isAvailable = appleAuth.isSupported;
      if (!isAvailable) {
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
        // NEW APPROACH: Check if account exists before calling server
        if (!isSignUp) {
          // For sign-in, check if account exists first
          const accountCheck = await checkAppleAccountExists(user, identityToken);
          if (!accountCheck.exists) {
            showCustomAlert(
              'Account Not Found', 
              'No account found with this Apple ID. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.'
            );
            return; // Don't call server, no Apple error popup
          }
        } else {
          // For sign-up, check if account already exists
          const accountCheck = await checkAppleAccountExists(user, identityToken);
          if (accountCheck.exists) {
            showCustomAlert(
              'Account Already Exists', 
              'An account already exists with this Apple ID. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
            );
            return; // Don't call server, no Apple error popup
          }
        }
        
        // Account exists or user is signing up - proceed with server call
        if (isSignUp) {
          await dispatch(appleSignUp(identityToken)).unwrap();
        } else {
          await dispatch(appleSignIn(identityToken)).unwrap();
        }
      } else {
        Alert.alert('Error', 'Apple Sign-In failed. Please try again.');
      }
    } catch (error: any) {
      // Handle specific Apple Sign In errors more gracefully
      // Error codes:
      // 1000: ASAuthorizationError.unknown - Unknown errors, misconfiguration, or other failures (NOT a cancellation)
      // 1001: ASAuthorizationError.canceled - User explicitly cancelled the authorization
      const errorCode = error.code !== undefined ? String(error.code) : '';
      
      // Only 1001 should be treated as user cancellation
      const isUserCancellation = errorCode === '1001' || 
                                error.message?.includes('cancelled') || 
                                error.message?.includes('canceled');
      
      if (isUserCancellation) {
        // Silently handle user cancellation - don't log or show error
        return;
      }
      
      // Log all errors for developers (app-side errors, misconfigurations, etc.)
      // Apple's native UI will handle displaying errors to users when appropriate
      // We don't show Alert.alert here to avoid blocking Apple's native error handling
      console.error('Apple Sign In Error:', {
        code: error.code,
        message: error.message,
        error: error
      });
      
      // Don't show Alert.alert - let Apple's native UI handle user-facing errors
      // For app-side errors, we handle them silently behind the scenes
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

      // Configure Google Sign In with correct webClientId for each platform
      const config = {
        webClientId: Platform.OS === 'ios' 
          ? GOOGLE_AUTH_CONFIG.webClientId      // iOS: use iOS client ID (works)
          : '213914599866-t8gaip17no3h323d71njchb4hbs3csco.apps.googleusercontent.com', // Android: use Web client ID
        iosClientId: GOOGLE_AUTH_CONFIG.iosClientId, // iOS Client ID (only for iOS)
        offlineAccess: true,
        forceCodeForRefreshToken: true, // Force account selection
        accountName: '', // Clear any cached account
      };

      
      GoogleSignin.configure(config);
      await GoogleSignin.hasPlayServices();
      
      // Sign out first to clear any cached credentials and force account selection
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        // No previous sign-in to clear
      }
      
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.type === 'cancelled' || userInfo.data === null) {
        return;
      }
      
      const idToken = userInfo.data?.idToken;
      const googleUserId = userInfo.data?.user?.id;
      
      if (idToken) {
        // NEW APPROACH: Check if account exists before calling server (only if we have googleUserId)
        if (googleUserId) {
          if (!isSignUp) {
            // For sign-in, check if account exists first
            const accountCheck = await checkGoogleAccountExists(googleUserId, idToken);
            if (!accountCheck.exists) {
              showCustomAlert(
                'Account Not Found', 
                'No account found with this Google account. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.'
              );
              return; // Don't call server, no Google error popup
            }
          } else {
            // For sign-up, check if account already exists
            const accountCheck = await checkGoogleAccountExists(googleUserId, idToken);
            if (accountCheck.exists) {
              showCustomAlert(
                'Account Already Exists', 
                'An account already exists with this Google account. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
              );
              return; // Don't call server, no Google error popup
            }
          }
        }
        
        // Account exists, user is signing up, or we don't have googleUserId - proceed with server call
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
            console.error('Google Sign In Error:', {
              code: error.code,
              message: error.message,
              error: error
            });
            throw error;
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
    <>
      <View style={styles.container}>
        <View style={[
          styles.logosContainer,
          Platform.OS === 'android' ? styles.logosContainerAndroid : styles.logosContainerIOS
        ]}>
          <View style={[
            styles.googleButtonContainer,
            Platform.OS === 'android' ? styles.googleButtonContainerAndroid : styles.googleButtonContainerIOS
          ]}>
            <GoogleSigninButton
              size={GoogleSigninButton.Size.Standard}
              color={GoogleSigninButton.Color.Dark}
              style={styles.googleButtonInner}
              onPress={handleGoogleSignIn}
            />
          </View>
          {Platform.OS === 'ios' && (
            <View style={styles.appleButtonContainer}>
              <AppleSignInButton
                onPress={handleAppleSignIn}
                style={styles.appleButtonInner}
                isSignUp={isSignUp}
              />
            </View>
          )}
        </View>
      </View>
      
      <AuthAlertModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMessage}
        onPress={hideCustomAlert}
      />
    </>
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
  // Android-specific styles - center the Google button
  logosContainerAndroid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
    position: 'relative',
  },
  // iOS-specific styles - keep side-by-side layout
  logosContainerIOS: {
    flexDirection: 'row',
    height: 48,
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
  // Android-specific Google button container - center it
  googleButtonContainerAndroid: {
    width: 160,
    height: 48,
    position: 'relative', // Change from absolute to relative for centering
    left: 'auto',
    top: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // iOS-specific Google button container - keep left positioning
  googleButtonContainerIOS: {
    width: 160,
    height: 48,
    position: 'absolute',
    left: 0,
    top: 0,
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
