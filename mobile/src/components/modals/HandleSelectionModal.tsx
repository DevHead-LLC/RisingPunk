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
import { containsBadWordsForHandle } from '../../utils/contentModeration';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  // Ref to store AbortController for cancelling network requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to store typing debounce timer
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to store bad words check debounce timer
  const badWordsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to TextInput for programmatic focus
  const textInputRef = useRef<TextInput>(null);
  
  // Track individual requirements
  const [requirements, setRequirements] = useState({
    minLength: false,
    validChars: false,
    noBadWords: false,
    unique: false
  });

  // Basic validation without expensive bad words check (for real-time validation)
  const validateHandleBasic = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'HANDLE_REQUIRED';
    }
    if (value.length < 5) {
      return 'HANDLE_TOO_SHORT';
    }
    if (value.length > 15) {
      return 'HANDLE_TOO_LONG';
    }
    if (!/^[a-zA-Z0-9!&%^*_]+$/.test(value)) {
      return 'HANDLE_INVALID_CHARS';
    }
    // Bad words check is debounced separately - not included here
    return '';
  }, []);

  // Full validation including bad words check (for final submission only)
  const validateHandle = useCallback((value: string): string => {
    const basicError = validateHandleBasic(value);
    if (basicError) {
      return basicError;
    }
    // Only check bad words on final validation (submission)
    if (containsBadWordsForHandle(value)) {
      return 'HANDLE_CONTAINS_BAD_WORDS';
    }
    return '';
  }, [validateHandleBasic]);

  // Check individual requirements (without bad words check - that's debounced separately)
  const checkRequirements = useCallback((value: string) => {
    setRequirements(prev => ({
      ...prev,
      minLength: value.length >= 5,
      validChars: /^[a-zA-Z0-9!&%^*_]+$/.test(value),
      // Keep noBadWords and unique from previous state - they're updated separately
    }));
  }, []);

  // Check handle availability in database with timeout and cancellation
  const checkHandleAvailability = useCallback(async (handleToCheck: string) => {
    // Use basic validation (without bad words) to check if handle is valid enough for availability check
    if (!handleToCheck.trim() || validateHandleBasic(handleToCheck)) {
      setIsHandleAvailable(false);
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsCheckingAvailability(true);
      
      // Create timeout promise (10 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          abortController.abort();
          reject(new Error('Request timeout'));
        }, 10000);
      });

      // Create fetch promise
      const fetchPromise = fetch(`${API_URL}/api/auth/check-handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ handle: handleToCheck }),
        signal: abortController.signal,
      });

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setIsHandleAvailable(data.available);
        // Update unique requirement
        setRequirements(prev => ({ ...prev, unique: data.available }));
      } else {
        setIsHandleAvailable(false);
        setRequirements(prev => ({ ...prev, unique: false }));
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError' || error.message === 'Request timeout') {
        return;
      }
      setIsHandleAvailable(false);
      setRequirements(prev => ({ ...prev, unique: false }));
    } finally {
      // Only update state if this is still the current request
      if (abortControllerRef.current === abortController) {
        setIsCheckingAvailability(false);
        setIsTyping(false);
      }
    }
  }, [validateHandleBasic]);

  // Real-time requirements checking and availability checking with debouncing
  useEffect(() => {
    // Clear existing timers
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    if (badWordsTimerRef.current) {
      clearTimeout(badWordsTimerRef.current);
    }

    // Check basic requirements on every keystroke (fast checks only)
    checkRequirements(handle);
    
    if (!handle.trim()) {
      setIsHandleAvailable(false);
      setRequirements(prev => ({ 
        ...prev, 
        unique: false,
        noBadWords: true // Empty handle is considered valid for bad words
      }));
      setIsTyping(false);
      return;
    }

    // Use basic validation (without expensive bad words check) for real-time validation
    const validationError = validateHandleBasic(handle);
    
    // Update ref to track current handle (needed for debounced checks)
    currentHandleRef.current = handle;

    if (validationError) {
      // Basic validation failed - clear availability and unique status
      setIsHandleAvailable(false);
      setRequirements(prev => ({ 
        ...prev, 
        unique: false,
        // Reset noBadWords to false when basic validation fails
        // This prevents stale "✓ No inappropriate language" when handle becomes invalid
        noBadWords: false
      }));
      setIsTyping(false);
      // Don't return early - still set up debounced bad words check if basic validation might pass soon
      // But since validation failed, we'll clear the bad words timer
      if (badWordsTimerRef.current) {
        clearTimeout(badWordsTimerRef.current);
        badWordsTimerRef.current = null;
      }
      return;
    }

    // Basic validation passed - set up debounced checks

    // Debounce bad words check (expensive operation) - only after user stops typing
    badWordsTimerRef.current = setTimeout(() => {
      if (currentHandleRef.current === handle) {
        const hasBadWords = containsBadWordsForHandle(handle);
        setRequirements(prev => ({ ...prev, noBadWords: !hasBadWords }));
      }
    }, 500); // Check after 500ms of no typing

    // Debounce the availability check to avoid excessive API calls
    const availabilityTimer = setTimeout(() => {
      if (currentHandleRef.current === handle) {
        checkHandleAvailability(handle);
      }
    }, 1000); // Check after 1 second of no typing

    // Clear typing flag after user stops typing
    typingTimerRef.current = setTimeout(() => {
      if (currentHandleRef.current === handle) {
        setIsTyping(false);
      }
    }, 600); // Clear typing flag after 600ms

    return () => {
      if (availabilityTimer) {
        clearTimeout(availabilityTimer);
      }
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (badWordsTimerRef.current) {
        clearTimeout(badWordsTimerRef.current);
      }
    };
  }, [handle, validateHandleBasic, checkHandleAvailability, checkRequirements]);

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
    // Don't update noBadWords here - let the debounced check handle it
  }, [error]);

  const handleKeyPress = useCallback((event: any) => {
    // Handle Backspace manually on Android since onChangeText doesn't fire reliably
    if (event.nativeEvent.key === 'Backspace' && handle.length > 0) {
      const newValue = handle.slice(0, -1);
      setHandle(newValue);
      setIsTyping(true);
      if (error) {
        setError('');
      }
    }
  }, [handle, error]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'HANDLE_REQUIRED':
        return 'Please enter a handle';
      case 'HANDLE_TOO_SHORT':
        return 'Handle must be at least 5 characters';
      case 'HANDLE_TOO_LONG':
        return 'Handle must be 15 characters or less';
      case 'HANDLE_INVALID_CHARS':
        return 'Handle can only contain letters, numbers, and !&%^*_';
      case 'HANDLE_CONTAINS_BAD_WORDS':
        return 'Handle contains inappropriate language';
      case 'HANDLE_ALREADY_EXISTS':
        return 'This handle is already taken';
      default:
        return 'Invalid handle';
    }
  };

  // Cleanup on unmount or when modal closes
  useEffect(() => {
    if (!visible) {
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      // Clear all timers
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (badWordsTimerRef.current) {
        clearTimeout(badWordsTimerRef.current);
        badWordsTimerRef.current = null;
      }
    }
  }, [visible]);

  const handleOverlayLayout = useCallback((event: any) => {
    // Layout callback for overlay (no logging needed)
  }, []);

  const handleModalContainerLayout = useCallback((event: any) => {
    // Layout callback for modal container (no logging needed)
  }, []);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <View 
        style={styles.overlay} 
        onLayout={handleOverlayLayout} 
        pointerEvents="box-none"
      >
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
              <View style={styles.modalContent}>
                  <Text style={[styles.title, { color: colors.primary }]}>
                    CHOOSE_YOUR_HANDLE
                  </Text>
                  
                  <Text style={[styles.subtitle, { color: colors.secondary }]}>
                    This will be your identity across the network
                  </Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      ref={textInputRef}
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
                  </View>
                  
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
                          {requirements.validChars ? '✓' : '✗'} Only letters, numbers, and !&%^*_
                        </Text>
                      </View>
                      <View style={styles.requirementItem}>
                        <Text style={[styles.requirementText, { 
                          color: requirements.noBadWords ? colors.success || '#4CAF50' : colors.error 
                        }]}>
                          {requirements.noBadWords ? '✓' : '✗'} No inappropriate language
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
                          backgroundColor: isLoading || validateHandleBasic(handle) || !isHandleAvailable || isCheckingAvailability || isTyping || !requirements.noBadWords ? colors.buttonDisabled : colors.buttonBg,
                          borderColor: colors.matrix,
                          flex: isRequired ? 1 : 0.6,
                        }
                      ]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          handleSubmit();
                        }
                      }}
                      onPressOut={() => {
                        if (Platform.OS === 'android') {
                          handleSubmit();
                        }
                      }}
                      disabled={isLoading || !!validateHandleBasic(handle) || !isHandleAvailable || isCheckingAvailability || isTyping || !requirements.noBadWords}
                    >
                      <Text style={[styles.submitText, { color: '#FFFFFF' }]}>
                        {isLoading ? 'SETTING_HANDLE...' : 'CONFIRM_HANDLE'}
                      </Text>
                      <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
                    </TouchableOpacity>
                  </View>
                </View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View 
            style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.matrix }]}
            onLayout={handleModalContainerLayout}
            pointerEvents="auto"
          >
            <View style={styles.modalContent}>
                  <Text style={[styles.title, { color: colors.primary }]}>
                    CHOOSE_YOUR_HANDLE
                  </Text>
                  
                  <Text style={[styles.subtitle, { color: colors.secondary }]}>
                    This will be your identity across the network
                  </Text>

                  <Pressable
                    style={styles.inputContainer}
                    onPress={() => {
                      textInputRef.current?.focus();
                    }}
                  >
                    <TextInput
                      ref={textInputRef}
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
                      onKeyPress={handleKeyPress}
                    />
                    {error ? (
                      <Text style={[styles.errorText, { color: colors.error }]}>
                        {getErrorMessage(error)}
                      </Text>
                    ) : null}
                  </Pressable>
                  
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
                          {requirements.validChars ? '✓' : '✗'} Only letters, numbers, and !&%^*_
                        </Text>
                      </View>
                      <View style={styles.requirementItem}>
                        <Text style={[styles.requirementText, { 
                          color: requirements.noBadWords ? colors.success || '#4CAF50' : colors.error 
                        }]}>
                          {requirements.noBadWords ? '✓' : '✗'} No inappropriate language
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
                          backgroundColor: isLoading || validateHandleBasic(handle) || !isHandleAvailable || isCheckingAvailability || isTyping || !requirements.noBadWords ? colors.buttonDisabled : colors.buttonBg,
                          borderColor: colors.matrix,
                          flex: isRequired ? 1 : 0.6,
                        }
                      ]}
                      onPress={() => {
                        if (Platform.OS === 'ios') {
                          handleSubmit();
                        }
                      }}
                      onPressOut={() => {
                        if (Platform.OS === 'android') {
                          handleSubmit();
                        }
                      }}
                      disabled={isLoading || !!validateHandleBasic(handle) || !isHandleAvailable || isCheckingAvailability || isTyping || !requirements.noBadWords}
                    >
                      <Text style={[styles.submitText, { color: '#FFFFFF' }]}>
                        {isLoading ? 'SETTING_HANDLE...' : 'CONFIRM_HANDLE'}
                      </Text>
                      <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
                    </TouchableOpacity>
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
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
    zIndex: 10001, // Higher than email verification (10000) and onboarding (1000)
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: Math.min(SCREEN_WIDTH * 0.9, 400),
    maxWidth: 400,
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
