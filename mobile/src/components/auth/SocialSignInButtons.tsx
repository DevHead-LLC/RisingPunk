import React, { memo, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useAppDispatch } from '../../store/hooks';
import { googleSignIn, googleSignUp, appleSignIn, appleSignUp } from '../../store/slices/authSlice';
import { GOOGLE_AUTH_CONFIG } from '../../config/googleAuth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
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
    
    console.log('🍎 ASI: Starting Apple Sign-In process');
    setIsProcessing(true);
    isProcessingRef.current = true;
    
    try {
      console.log('🍎 ASI: Performing Apple Sign-In request');
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const { identityToken, nonce } = appleAuthRequestResponse;
      
      if (identityToken) {
        console.log('🍎 ASI: Apple Sign-In successful, dispatching to Redux');
        console.log('🍎 ASI: Identity token length:', identityToken.length);
        
        if (isSignUp) {
          await dispatch(appleSignUp(identityToken)).unwrap();
        } else {
          await dispatch(appleSignIn(identityToken)).unwrap();
        }
      } else {
        console.log('🍎 ASI: Apple Sign-In failed - no identity token');
        Alert.alert('Error', 'Apple Sign-In failed. Please try again.');
      }
    } catch (error: any) {
      console.log('🍎 ASI: Apple Sign-In error:', error);
      
      if (!error.message?.includes('cancelled') && !error.message?.includes('canceled')) {
        Alert.alert('Error', `Apple Sign-In failed: ${error.message}`);
      }
    } finally {
      console.log('🍎 ASI: Apple Sign-In process completed');
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [dispatch, isSignUp]); // Removed isProcessing from dependencies to prevent race condition

  const handleGoogleSignIn = useCallback(async () => {
    if (isProcessing || isProcessingRef.current) return;
    
    console.log('🔧 Google Sign In: Starting process');
    setIsProcessing(true);
    isProcessingRef.current = true;
    try {
      // Configure Google Sign In
      const config = {
        webClientId: GOOGLE_AUTH_CONFIG.webClientId,
        iosClientId: GOOGLE_AUTH_CONFIG.iosClientId,
        forceCodeForRefreshToken: true, // Force account selection
      };
      
      console.log('🔧 Google Sign In: Config being used:', config);
      GoogleSignin.configure(config);
      console.log('🔧 Google Sign In: GoogleSignin configured');
      
      await GoogleSignin.hasPlayServices();
      console.log('🔧 Google Sign In: Play services check passed');
      
      console.log('🔧 Google Sign In: About to call GoogleSignin.signIn()');
      const userInfo = await GoogleSignin.signIn();
      console.log('🔧 Google Sign In: Sign in result:', userInfo);
      
      if (userInfo.type === 'cancelled' || userInfo.data === null) {
        console.log('🔧 Google Sign In: Sign in was cancelled or returned null data');
        return;
      }
      
      const idToken = userInfo.data?.idToken;
      console.log('🔧 Google Sign In: ID token received:', idToken ? 'YES' : 'NO');
      
      if (idToken) {
        console.log('🔧 Google Sign In: Dispatching to Redux, isSignUp:', isSignUp);
        if (isSignUp) {
          await dispatch(googleSignUp(idToken)).unwrap();
        } else {
          await dispatch(googleSignIn(idToken)).unwrap();
        }
        console.log('🔧 Google Sign In: Redux dispatch completed successfully');
      } else {
        console.log('🔧 Google Sign In: No ID token received from Google');
        throw new Error('No ID token received from Google');
      }
    } catch (error: any) {
      console.log('🔧 Google Sign In: Error caught:', error);
      console.log('🔧 Google Sign In: Error code:', error.code);
      console.log('🔧 Google Sign In: Error message:', error.message);
      
      if (error.code !== 'SIGN_IN_CANCELLED' && error.code !== 'IN_PROGRESS') {
        console.log('🔧 Google Sign In: Throwing error (not cancelled/in progress)');
        throw error;
      } else {
        console.log('🔧 Google Sign In: Error was cancelled/in progress, not throwing');
      }
    } finally {
      console.log('🔧 Google Sign In: Finally block - setting isProcessing to false');
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
  },
  alternativeButton: {
    height: 48,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 0, // Remove green border
    borderRadius: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logosContainer: {
    flexDirection: 'row',
    height: 48, // Increased container height to accommodate Google button
    position: 'relative',
  },
  socialButton: {
    width: 160,
    height: 48, // Match container height
    position: 'absolute',
    top: 0, // Force both buttons to same top position
  },
  googleButtonContainer: {
    width: 160,
    height: 48, // Match the parent container height
    position: 'absolute',
    left: 0,
    top: 0, // Force to same top position as Apple button
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -2 }], // Move Google button up to match Apple button
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
    height: 48, // Match container height
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
  buttonText: {
    fontSize: SIZING.font.body,
    fontWeight: '500',
    letterSpacing: 1,
  },
  buttonCorner: {
    ...styleGuide.cornerDecoration,
  },
});
