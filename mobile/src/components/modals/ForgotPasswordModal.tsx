import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING, styleGuide } from '../../styles/theme';
import { useForgotPasswordMutation } from '../../store/api/authApi';

interface ForgotPasswordModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isVisible,
  onClose,
}) => {
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPassword] = useForgotPasswordMutation();

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await forgotPassword({ email: email.trim() }).unwrap();
      
      Alert.alert(
        'Password Reset Sent',
        'If an account with this email exists and is verified, you will receive a password reset link shortly. Please check your email and follow the instructions to reset your password.',
        [
          {
            text: 'OK',
            onPress: () => {
              setEmail('');
              onClose();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      let errorMessage = 'Failed to send password reset email. Please try again.';
      
      if (error?.data?.error) {
        if (error.data.error.includes('Email must be verified')) {
          errorMessage = 'This email address is not verified. Please verify your email first or sign in with Google if you used Google Sign-In.';
        } else if (error.data.error.includes('Google account')) {
          errorMessage = 'This account uses Google Sign-In. Please use the "Sign in with Google" button instead.';
        } else {
          errorMessage = error.data.error;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, forgotPassword, onClose]);

  const handleClose = useCallback(() => {
    setEmail('');
    onClose();
  }, [onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.matrix }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>
            FORGOT_PASSWORD
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: colors.matrix }]}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={[styles.description, { color: colors.secondary }]}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.matrix,
                  color: colors.primary,
                },
              ]}
              placeholder="EMAIL_ADDRESS"
              placeholderTextColor={colors.matrix}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />
            <View style={[styles.inputCorner, { borderColor: colors.matrix }]} />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: isSubmitting ? colors.buttonDisabled : colors.buttonBg,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={[styles.submitText, { color: '#FFFFFF' }]}>
                {isSubmitting ? 'SENDING...' : 'SEND_RESET_LINK'}
              </Text>
              <View style={[styles.buttonCorner, { borderColor: colors.primary }]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.matrix }]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelText, { color: colors.matrix }]}>
                CANCEL
              </Text>
              <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 8,
    borderWidth: 2,
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: SIZING.font.h3,
    fontWeight: '600',
    letterSpacing: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: SIZING.spacing.lg,
  },
  description: {
    fontSize: SIZING.font.body,
    lineHeight: 20,
    marginBottom: SIZING.spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: SIZING.spacing.lg,
  },
  input: {
    ...styleGuide.inputField,
    height: 48,
    paddingHorizontal: SIZING.spacing.md,
    borderWidth: 2,
    borderRadius: 4,
  },
  inputCorner: {
    ...styleGuide.cornerDecoration,
  },
  buttonContainer: {
    gap: SIZING.spacing.md,
  },
  submitButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderRadius: 4,
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
    position: 'relative',
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: 'transparent',
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
