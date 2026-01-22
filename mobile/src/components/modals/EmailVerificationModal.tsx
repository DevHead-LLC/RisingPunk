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
      
      // Debug logging for positioning
      console.log('📧 EmailVerificationModal - Modal opened');
      console.log('📧 Screen dimensions:', { width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
      console.log('📧 Modal visible:', visible);
    } else if (!visible) {
      hasInitialized.current = false;
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
    console.log('📧 handleClose called');
    if (onClose) {
      markUserAsPrompted();
      onClose();
    }
  }, [onClose, markUserAsPrompted]);

  const handleSkipPress = useCallback(() => {
    console.log('📧 SKIP FOR NOW button pressed');
    handleClose();
  }, [handleClose]);

  const handleSkipPressOut = useCallback(() => {
    if (Platform.OS === 'android') {
      console.log('📧 SKIP FOR NOW button pressOut (Android)');
      handleClose();
    }
  }, [handleClose]);

  const handleClosePressOut = useCallback(() => {
    if (Platform.OS === 'android' && onClose) {
      markUserAsPrompted();
      onClose();
    }
  }, [onClose, markUserAsPrompted]);

  const handleOverlayLayout = useCallback((event: any) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    console.log('📧 Overlay layout:', { width, height, x, y, screenWidth: SCREEN_WIDTH, screenHeight: SCREEN_HEIGHT });
  }, []);

  const handleModalContainerLayout = useCallback((event: any) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    console.log('📧 Modal container layout:', { width, height, x, y });
    console.log('📧 Expected center X:', SCREEN_WIDTH / 2, 'Actual X:', x, 'Difference:', Math.abs((SCREEN_WIDTH / 2) - (x + width / 2)));
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
            onPress={handleSkipPress}
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
      <View style={styles.overlay} onLayout={handleOverlayLayout}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={0}
          >
            <View 
              style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.matrix }]}
              onLayout={handleModalContainerLayout}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: colors.primary, borderColor: colors.secondary },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={handleClose}
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
          <View style={styles.keyboardAvoidingView}>
            <View 
              style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.matrix }]}
              onLayout={handleModalContainerLayout}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.closeButton,
                  { backgroundColor: colors.primary, borderColor: colors.secondary },
                  pressed && { opacity: 0.7 }
                ]}
                onPress={handleClose}
                onPressOut={handleClosePressOut}
              >
                <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
              </Pressable>
              <View style={styles.modalContent}>
                {renderEmailInput()}
              </View>
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
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.lg,
    zIndex: 10000, // Higher than onboarding zIndex: 1000
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
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
    alignSelf: 'center',
    marginHorizontal: 'auto',
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
