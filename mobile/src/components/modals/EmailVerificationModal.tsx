import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Pressable,
} from 'react-native';
import { SIZING, styleGuide } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { API_URL } from '../../config';
import { useAppSelector } from '../../store/hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EmailVerificationModalProps {
  visible: boolean;
  userEmail?: string;
  userHandle?: string;
  onClose?: () => void;
  onVerificationSent?: () => void;
  isRequired?: boolean;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  visible,
  userEmail = '',
  userHandle = '',
  onClose,
  onVerificationSent,
  isRequired = false,
}) => {
  const [email, setEmail] = useState(userEmail);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colors = useThemeColors();
  const token = useAppSelector((state) => state.auth.token);
  const hasInitialized = useRef(false);
  const isClosingRef = useRef(false); // Prevent duplicate close calls on Android

  const markUserAsPrompted = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/mark-email-verification-prompted`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('❌ Failed to mark user as prompted:', error);
    }
  }, [token]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible && !hasInitialized.current) {
      setEmail(userEmail || '');
      setError('');
      setIsLoading(false);
      hasInitialized.current = true;
      isClosingRef.current = false; // Reset close guard
      
    } else if (!visible) {
      hasInitialized.current = false;
      isClosingRef.current = false; // Reset close guard when modal closes
    }
  }, [visible, userEmail]);

  const validateEmail = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'EMAIL_REQUIRED';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'EMAIL_INVALID';
    }
    return '';
  }, []);

  const sendVerificationEmail = useCallback(async (emailToSend: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: emailToSend
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        onVerificationSent?.();
        // Mark user as prompted when they successfully send verification email
        markUserAsPrompted();
        // Close modal immediately after successful send
        setTimeout(() => {
          onClose?.();
        }, 100); // Small delay to ensure state updates
        return true;
      } else {
        setError(data.error || 'Failed to send verification email');
        return false;
      }
    } catch (error) {
      setError('Network error. Please try again.');
      return false;
    }
  }, [onVerificationSent, onClose]);

  const handleSubmit = useCallback(async () => {
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await sendVerificationEmail(email.trim());
    } finally {
      setIsLoading(false);
    }
  }, [email, validateEmail, sendVerificationEmail]);


  const handleTextChange = useCallback((text: string) => {
    setEmail(text);
    if (error) {
      setError('');
    }
  }, [error]);

  const handleClose = useCallback(() => {
    // Prevent duplicate calls on Android (both onPress and onPressOut fire)
    if (isClosingRef.current) {
      return;
    }
    
    isClosingRef.current = true;
    
    if (onClose) {
      markUserAsPrompted();
      onClose();
    }
  }, [onClose, markUserAsPrompted]);

  const handleSkipPress = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleSkipPressOut = useCallback(() => {
    // On Android, onPressOut fires reliably when onPress may not
    // Handle action here for Android, ref guard prevents duplicates
    if (Platform.OS === 'android') {
      handleClose();
    }
    // On iOS, onPress fires reliably, so this is a no-op
  }, [handleClose]);

  const handleClosePressOut = useCallback(() => {
    // On Android, onPressOut fires reliably when onPress may not
    // Handle action here for Android, ref guard prevents duplicates
    if (Platform.OS === 'android') {
      handleClose();
    }
    // On iOS, onPress fires reliably, so this is a no-op
  }, [handleClose]);

  const handleOverlayLayout = useCallback((event: any) => {
    // Layout callback - no action needed
  }, []);

  const handleModalContainerLayout = useCallback((event: any) => {
    // Layout callback - no action needed
  }, []);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'EMAIL_REQUIRED':
        return 'Please enter your email address';
      case 'EMAIL_INVALID':
        return 'Please enter a valid email address';
      default:
        return errorCode;
    }
  };

  const renderEmailInput = () => (
    <>
      <Text style={[styles.title, { color: colors.primary }]}>
        VERIFY YOUR EMAIL
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.secondary }]}>
        We need to verify your email address to ensure you can recover your account if needed.
      </Text>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              { 
                color: colors.text.primary,
                borderColor: error ? colors.error : colors.matrix,
                backgroundColor: colors.inputBg || colors.background,
              }
            ]}
            value={email}
            onChangeText={handleTextChange}
            placeholder="Enter your email address..."
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isLoading}
          />
          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {getErrorMessage(error)}
            </Text>
          ) : null}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.warningContainer}>
        <Text style={[styles.warningText, { color: colors.error }]}>
          ⚠️ Important: Without email verification, you may not be able to recover your account if you forget your password.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {!isRequired && onClose && (
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              { 
                backgroundColor: colors.background + 'CC',
                borderColor: colors.text.secondary,
              },
              pressed && { opacity: 0.7 }
            ]}
            onPress={() => {
              // On Android, onPressOut handles the action, but call here too in case it fires
              // Ref guard prevents duplicate calls
              if (Platform.OS === 'ios') {
                handleSkipPress();
              }
            }}
            onPressOut={handleSkipPressOut}
          >
            <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
              SKIP FOR NOW
            </Text>
          </Pressable>
        )}
        
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { 
              backgroundColor: isLoading || !!validateEmail(email) ? colors.buttonDisabled : colors.buttonBg,
              borderColor: colors.matrix,
              flex: isRequired ? 1 : 0.6,
            },
            pressed && { opacity: 0.7 }
          ]}
          onPress={handleSubmit}
          disabled={isLoading || !!validateEmail(email)}
        >
          <Text style={[styles.submitText, { color: '#FFFFFF' }]}>
            {isLoading ? 'SENDING...' : 'SEND VERIFICATION'}
          </Text>
          <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
        </Pressable>
      </View>
    </>
  );


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay} onLayout={handleOverlayLayout} pointerEvents="box-none">
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={0}
          >
            <View 
              style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.matrix }]}
              onLayout={handleModalContainerLayout}
              pointerEvents="auto"
            >
              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: colors.primary, borderColor: colors.secondary },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => {
                  console.log('📱 EmailVerificationModal - Close button onPress (iOS)');
                  handleClose();
                }}
                onPressIn={() => {
                  console.log('📱 EmailVerificationModal - Close button onPressIn (iOS)');
                }}
                onPressOut={handleClosePressOut}
              >
                <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
              </Pressable>
              <View style={styles.modalContent}>
                {renderEmailInput()}
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View 
            style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.matrix }]}
            onLayout={handleModalContainerLayout}
            pointerEvents="auto"
          >
            <Pressable
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.primary, borderColor: colors.secondary },
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => {
                // On Android, onPressOut handles the action, but call here too in case it fires
                // Ref guard prevents duplicate calls
                if (Platform.OS === 'ios') {
                  handleClose();
                }
              }}
              onPressOut={handleClosePressOut}
            >
              <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
            </Pressable>
            <View style={styles.modalContent}>
              {renderEmailInput()}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
    zIndex: 10000, // Higher than onboarding zIndex: 1000
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Math.min(SCREEN_WIDTH * 0.9, 500),
    maxWidth: 500,
    borderRadius: 8,
    borderWidth: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  modalContent: {
    padding: SIZING.spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 40,
    height: 40,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButtonText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    opacity: 0.8,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: SIZING.spacing.lg,
  },
  input: {
    ...styleGuide.inputField,
    height: 48,
    fontSize: SIZING.font.body,
    textAlign: 'center',
    borderWidth: 2,
    borderRadius: 4,
  },
  emailDisplay: {
    height: 48,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  emailText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    opacity: 0.8,
    lineHeight: 20,
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.lg,
  },
  warningText: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
    lineHeight: 16,
  },
  errorText: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.sm,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
    marginTop: SIZING.spacing.md,
  },
  submitButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderRadius: 4,
  },
  resendButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderRadius: 4,
    flex: 1,
  },
  submitText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    letterSpacing: 1,
  },
  cancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 4,
    flex: 0.4,
  },
  cancelText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    letterSpacing: 1,
  },
  buttonCorner: {
    ...styleGuide.cornerDecoration,
  },
});
