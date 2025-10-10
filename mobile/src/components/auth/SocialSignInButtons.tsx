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

  const checkAppleAccountExists = async (appleUserId: string, identityToken: string): Promise<{exists: boolean}> => {
    try {
      console.log('🔍 DEBUG: Starting Apple account check');
      console.log('🔍 DEBUG: Apple User ID:', appleUserId);
      console.log('🔍 DEBUG: Identity Token length:', identityToken?.length);
      console.log('🔍 DEBUG: API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/auth/check-apple-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appleId: appleUserId, identityToken }),
      });
      
      console.log('🔍 DEBUG: Response status:', response.status);
      console.log('🔍 DEBUG: Response ok:', response.ok);
      
      const result = await response.json();
      console.log('🔍 DEBUG: Response result:', result);
      
      return result;
    } catch (error) {
      console.error('🔍 DEBUG: Error checking Apple account:', error);
      return { exists: false };
    }
  };

  const checkGoogleAccountExists = async (googleUserId: string, idToken: string): Promise<{exists: boolean}> => {
    try {
      console.log('🔍 DEBUG: Starting Google account check');
      console.log('🔍 DEBUG: Google User ID:', googleUserId);
      console.log('🔍 DEBUG: ID Token length:', idToken?.length);
      console.log('🔍 DEBUG: API URL:', API_URL);
      
      const response = await fetch(`${API_URL}/api/auth/check-google-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleId: googleUserId, idToken }),
      });
      
      console.log('🔍 DEBUG: Response status:', response.status);
      console.log('🔍 DEBUG: Response ok:', response.ok);
      
      const result = await response.json();
      console.log('🔍 DEBUG: Response result:', result);
      
      return result;
    } catch (error) {
      console.error('🔍 DEBUG: Error checking Google account:', error);
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
        console.log('🔍 DEBUG: Apple Sign In successful, starting pre-validation');
        console.log('🔍 DEBUG: isSignUp:', isSignUp);
        console.log('🔍 DEBUG: Apple User ID:', user);
        
        // NEW APPROACH: Check if account exists before calling server
        if (!isSignUp) {
          console.log('🔍 DEBUG: Sign-in flow - checking if account exists');
          // For sign-in, check if account exists first
          const accountCheck = await checkAppleAccountExists(user, identityToken);
          console.log('🔍 DEBUG: Account check result:', accountCheck);
          
          if (!accountCheck.exists) {
            console.log('🔍 DEBUG: Account not found - showing custom error and returning');
            Alert.alert(
              'Account Not Found', 
              'No account found with this Apple ID. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.'
            );
            return; // Don't call server, no Apple error popup
          }
          console.log('🔍 DEBUG: Account exists - proceeding with server call');
        } else {
          console.log('🔍 DEBUG: Sign-up flow - checking if account already exists');
          // For sign-up, check if account already exists
          const accountCheck = await checkAppleAccountExists(user, identityToken);
          console.log('🔍 DEBUG: Account check result:', accountCheck);
          
          if (accountCheck.exists) {
            console.log('🔍 DEBUG: Account already exists - showing custom error and returning');
            Alert.alert(
              'Account Already Exists', 
              'An account already exists with this Apple ID. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
            );
            return; // Don't call server, no Apple error popup
          }
          console.log('🔍 DEBUG: Account does not exist - proceeding with server call');
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
      const errorCode = error.code !== undefined ? String(error.code) : '';
      const isUserCancellation = errorCode === '1001' || 
                                error.message?.includes('cancelled') || 
                                error.message?.includes('canceled');
      
      if (isUserCancellation) {
        // Don't log or show error for user cancellation
        return;
      }
      
      // DETAILED ERROR LOGGING FOR INVESTIGATION (only for non-cancellation errors)
      console.error('🔴 REACT NATIVE APPLE SIGN IN ERROR DEBUG:');
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      console.error('   Full error object:', error);
      
      if (errorCode === 'UNKNOWN_ERROR') {
        Alert.alert('Sign In Issue', error.message || 'Unable to sign in with Apple. Please try again.');
      } else {
        Alert.alert('Sign In Issue', error.message || 'Unable to sign in with Apple. Please try again.');
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
      const googleUserId = userInfo.data?.user?.id;
      
      if (idToken) {
        console.log('🔍 DEBUG: Google Sign In successful, starting pre-validation');
        console.log('🔍 DEBUG: isSignUp:', isSignUp);
        console.log('🔍 DEBUG: Google User ID:', googleUserId);
        
        // NEW APPROACH: Check if account exists before calling server (only if we have googleUserId)
        if (googleUserId) {
          if (!isSignUp) {
            console.log('🔍 DEBUG: Sign-in flow - checking if account exists');
            // For sign-in, check if account exists first
            const accountCheck = await checkGoogleAccountExists(googleUserId, idToken);
            console.log('🔍 DEBUG: Account check result:', accountCheck);
            
            if (!accountCheck.exists) {
              console.log('🔍 DEBUG: Account not found - showing custom error and returning');
              Alert.alert(
                'Account Not Found', 
                'No account found with this Google account. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.'
              );
              return; // Don't call server, no Google error popup
            }
            console.log('🔍 DEBUG: Account exists - proceeding with server call');
          } else {
            console.log('🔍 DEBUG: Sign-up flow - checking if account already exists');
            // For sign-up, check if account already exists
            const accountCheck = await checkGoogleAccountExists(googleUserId, idToken);
            console.log('🔍 DEBUG: Account check result:', accountCheck);
            
            if (accountCheck.exists) {
              console.log('🔍 DEBUG: Account already exists - showing custom error and returning');
              Alert.alert(
                'Account Already Exists', 
                'An account already exists with this Google account. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.'
              );
              return; // Don't call server, no Google error popup
            }
            console.log('🔍 DEBUG: Account does not exist - proceeding with server call');
          }
        } else {
          console.log('🔍 DEBUG: No Google User ID available - proceeding with server call');
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
