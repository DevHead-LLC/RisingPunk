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
} from 'react-native';
import { SIZING, styleGuide } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { API_URL } from '../../config';

interface HandleSelectionModalProps {
  visible: boolean;
  onSubmit: (handle: string) => Promise<void>;
  isLoading?: boolean;
  isRequired?: boolean;
  onClose?: () => void;
}

export const HandleSelectionModal: React.FC<HandleSelectionModalProps> = ({
  visible,
  onSubmit,
  isLoading = false,
  isRequired = false,
  onClose,
}) => {
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isHandleAvailable, setIsHandleAvailable] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const colors = useThemeColors();
  
  // Ref to track the current handle being checked
  const currentHandleRef = useRef('');
  
  // Track individual requirements
  const [requirements, setRequirements] = useState({
    minLength: false,
    validChars: false,
    unique: false
  });

  const validateHandle = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'HANDLE_REQUIRED';
    }
    if (value.length < 5) {
      return 'HANDLE_TOO_SHORT';
    }
    if (value.length > 15) {
      return 'HANDLE_TOO_LONG';
    }
    if (!/^[a-zA-Z0-9!&%^*]+$/.test(value)) {
      return 'HANDLE_INVALID_CHARS';
    }
    return '';
  }, []);

  // Check individual requirements
  const checkRequirements = useCallback((value: string) => {
    const newRequirements = {
      minLength: value.length >= 5,
      validChars: /^[a-zA-Z0-9!&%^*]+$/.test(value),
      unique: false // Will be set by availability check
    };
    setRequirements(newRequirements);
  }, []);

  // Check handle availability in database
  const checkHandleAvailability = useCallback(async (handleToCheck: string) => {
    if (!handleToCheck.trim() || validateHandle(handleToCheck)) {
      setIsHandleAvailable(false);
      return;
    }

    try {
      setIsCheckingAvailability(true);
      const response = await fetch(`${API_URL}/api/auth/check-handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handle: handleToCheck }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsHandleAvailable(data.available);
        // Update unique requirement
        setRequirements(prev => ({ ...prev, unique: data.available }));
      } else {
        setIsHandleAvailable(false);
        setRequirements(prev => ({ ...prev, unique: false }));
      }
    } catch (error) {
      setIsHandleAvailable(false);
    } finally {
      setIsCheckingAvailability(false);
      setIsTyping(false);
    }
  }, [validateHandle]);

  // Real-time requirements checking and availability checking with debouncing
  useEffect(() => {
    // Check requirements on every keystroke
    checkRequirements(handle);
    
    if (!handle.trim()) {
      setIsHandleAvailable(false);
      setRequirements(prev => ({ ...prev, unique: false }));
      return;
    }

    const validationError = validateHandle(handle);
    if (validationError) {
      setIsHandleAvailable(false);
      setRequirements(prev => ({ ...prev, unique: false }));
      return;
    }

    // Update ref to track current handle
    currentHandleRef.current = handle;

    // Debounce the check to avoid excessive API calls
    const timer = setTimeout(() => {
      if (currentHandleRef.current === handle) {
        checkHandleAvailability(handle);
      }
    }, 1000); // Check after 1 second of no typing

    return () => clearTimeout(timer);
  }, [handle, validateHandle, checkHandleAvailability, checkRequirements]);

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
    setIsTyping(true);
    if (error) {
      setError('');
    }
  }, [error]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'HANDLE_REQUIRED':
        return 'Please enter a handle';
      case 'HANDLE_TOO_SHORT':
        return 'Handle must be at least 5 characters';
      case 'HANDLE_TOO_LONG':
        return 'Handle must be 15 characters or less';
      case 'HANDLE_INVALID_CHARS':
        return 'Handle can only contain letters, numbers, and !&%^*';
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
      supportedOrientations={['landscape']}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, justifyContent: 'center' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
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
                maxLength={15}
                editable={!isLoading}
              />
              {error ? (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {getErrorMessage(error)}
                </Text>
              ) : null}
              
              {/* Requirements Checklist */}
              <View style={styles.requirementsContainer}>
                <Text style={[styles.requirementsTitle, { color: colors.secondary }]}>
                  Requirements:
                </Text>
                <View style={styles.requirementItem}>
                  <Text style={[styles.requirementText, { 
                    color: requirements.minLength ? colors.success || '#4CAF50' : colors.error 
                  }]}>
                    {requirements.minLength ? '✓' : '✗'} At least 5 characters
                  </Text>
                </View>

                <View style={styles.requirementItem}>
                  <Text style={[styles.requirementText, { 
                    color: requirements.validChars ? colors.success || '#4CAF50' : colors.error 
                  }]}>
                    {requirements.validChars ? '✓' : '✗'} Only letters, numbers, and !&%^*
                  </Text>
                </View>
                <View style={styles.requirementItem}>
                  <Text style={[styles.requirementText, { 
                    color: isCheckingAvailability ? colors.secondary : 
                           requirements.unique ? colors.success || '#4CAF50' : colors.error 
                  }]}>
                    {isCheckingAvailability ? 'Checking uniqueness...' :
                     requirements.unique ? '✓ Unique' : '✗ Unique'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {!isRequired && onClose && (
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    { 
                      backgroundColor: colors.background + 'CC',
                      borderColor: colors.text.secondary,
                    }
                  ]}
                  onPress={onClose}
                >
                  <Text style={[styles.cancelText, { color: colors.text.secondary }]}>
                    CANCEL
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { 
                    backgroundColor: isLoading || validateHandle(handle) || !isHandleAvailable || isCheckingAvailability || isTyping ? colors.buttonDisabled : colors.buttonBg,
                    borderColor: colors.matrix,
                    flex: isRequired ? 1 : 0.6,
                  }
                ]}
                onPress={handleSubmit}
                disabled={isLoading || !!validateHandle(handle) || !isHandleAvailable || isCheckingAvailability || isTyping}
              >
                <Text style={[styles.submitText, { color: '#FFFFFF' }]}>
                  {isLoading ? 'SETTING_HANDLE...' : 'CONFIRM_HANDLE'}
                </Text>
                <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
              </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
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
  statusText: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.sm,
    textAlign: 'center',
  },
  requirementsContainer: {
    marginTop: SIZING.spacing.md,
    padding: SIZING.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
  },
  requirementsTitle: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  requirementItem: {
    marginVertical: 2,
  },
  requirementText: {
    fontSize: SIZING.font.small,
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
