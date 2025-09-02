import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { SIZING, styleGuide } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface HandleSelectionModalProps {
  visible: boolean;
  onSubmit: (handle: string) => Promise<void>;
  isLoading?: boolean;
}

export const HandleSelectionModal: React.FC<HandleSelectionModalProps> = ({
  visible,
  onSubmit,
  isLoading = false,
}) => {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const colors = useThemeColors();

  const validateHandle = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'HANDLE_REQUIRED';
    }
    if (value.length < 3) {
      return 'HANDLE_TOO_SHORT';
    }
    if (value.length > 20) {
      return 'HANDLE_TOO_LONG';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return 'HANDLE_INVALID_CHARS';
    }
    return '';
  }, []);

  const handleSubmit = useCallback(async () => {
    const validationError = validateHandle(handle);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    try {
      await onSubmit(handle.trim());
    } catch (err) {
      setError('HANDLE_ALREADY_EXISTS');
    }
  }, [handle, onSubmit, validateHandle]);

  const handleTextChange = useCallback((text: string) => {
    setHandle(text);
    if (error) {
      setError('');
    }
  }, [error]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'HANDLE_REQUIRED':
        return 'Please enter a handle';
      case 'HANDLE_TOO_SHORT':
        return 'Handle must be at least 3 characters';
      case 'HANDLE_TOO_LONG':
        return 'Handle must be 20 characters or less';
      case 'HANDLE_INVALID_CHARS':
        return 'Handle can only contain letters, numbers, _ and -';
      case 'HANDLE_ALREADY_EXISTS':
        return 'This handle is already taken';
      default:
        return 'Invalid handle';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalContent, { borderColor: colors.matrix }]}>
            <Text style={[styles.title, { color: colors.primary }]}>
              CHOOSE_YOUR_HANDLE
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.secondary }]}>
              This will be your identity across the network
            </Text>

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
                value={handle}
                onChangeText={handleTextChange}
                placeholder="Enter handle..."
                placeholderTextColor={colors.secondary}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                editable={!isLoading}
              />
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {getErrorMessage(error)}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { 
                  backgroundColor: isLoading || !handle.trim() ? colors.buttonDisabled : colors.buttonBg,
                  borderColor: colors.matrix,
                }
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !handle.trim()}
            >
              <Text style={[styles.submitText, { color: '#FFFFFF' }]}>
                {isLoading ? 'SETTING_HANDLE...' : 'CONFIRM_HANDLE'}
              </Text>
              <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    borderWidth: 2,
  },
  modalContent: {
    padding: SIZING.spacing.lg,
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
  errorText: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.sm,
    textAlign: 'center',
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
  buttonCorner: {
    ...styleGuide.cornerDecoration,
  },
});
