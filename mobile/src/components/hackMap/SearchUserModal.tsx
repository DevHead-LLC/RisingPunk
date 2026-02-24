/**
 * Modal to search for a user by handle (exact match, case-insensitive).
 * Uses same character rules as handle creation: letters, numbers, !&%^*_; 5–15 chars.
 * On success opens the visiting profile for that user; on not found shows an error.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useLazyLookupUserByHandleQuery } from '../../store/api/authApi';
import { useSendAdminMessageToAllMutation } from '../../store/api/privateMessagesApi';
import { containsBadWordsForHandle } from '../../utils/contentModeration';

/** Max body length so body + "\n\n" + server footer stays ≤ 600 (schema message maxlength). */
const ADMIN_MESSAGE_MAX_LENGTH = 512;

const HANDLE_VALID_CHARS = /^[a-zA-Z0-9!&%^*_]*$/;
const MIN_LENGTH = 5;
const MAX_LENGTH = 15;

function filterHandleInput(text: string): string {
  return text.replace(/[^a-zA-Z0-9!&%^*_]/g, '');
}

export interface SearchUserModalProps {
  visible: boolean;
  onClose: () => void;
  onUserFound: (userId: string, handle: string) => void;
  /** When true, show "Message all users" admin section (one-way broadcast). */
  isAdmin?: boolean;
}

export const SearchUserModal: React.FC<SearchUserModalProps> = ({
  visible,
  onClose,
  onUserFound,
  isAdmin = false,
}) => {
  const colors = useThemeColors();
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminStatus, setAdminStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [adminStatusText, setAdminStatusText] = useState('');
  const [trigger, { isLoading }] = useLazyLookupUserByHandleQuery();
  const [sendToAll, { isLoading: isSendingToAll }] = useSendAdminMessageToAllMutation();

  useEffect(() => {
    if (visible) {
      setHandle('');
      setError('');
      setAdminStatus('idle');
      setAdminStatusText('');
    }
  }, [visible]);

  const validateHandle = useCallback((value: string): string => {
    if (!value.trim()) return 'Enter a handle to search.';
    if (value.length < MIN_LENGTH) return `Handle must be at least ${MIN_LENGTH} characters.`;
    if (value.length > MAX_LENGTH) return `Handle must be ${MAX_LENGTH} characters or less.`;
    if (!HANDLE_VALID_CHARS.test(value)) return 'Handle can only contain letters, numbers, and !&%^*_';
    if (containsBadWordsForHandle(value)) return 'Handle contains inappropriate language.';
    return '';
  }, []);

  const handleTextChange = useCallback((text: string) => {
    const filtered = filterHandleInput(text);
    if (filtered.length <= MAX_LENGTH) {
      setHandle(filtered);
      setError('');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const validationError = validateHandle(handle);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    try {
      const result = await trigger(handle.trim()).unwrap();
      onUserFound(result.userId, result.handle);
      onClose();
    } catch (err: any) {
      const status = err?.status;
      if (status === 404) {
        setError('This user does not exist.');
      } else {
        setError('Could not look up user. Try again.');
      }
    }
  }, [handle, validateHandle, trigger, onUserFound, onClose]);

  const handleClose = useCallback(() => {
    setError('');
    onClose();
  }, [onClose]);

  const handleSendToAll = useCallback(async () => {
    const trimmed = adminMessage.trim();
    if (!trimmed || isSendingToAll) return;
    if (trimmed.length > ADMIN_MESSAGE_MAX_LENGTH) {
      setAdminStatus('error');
      setAdminStatusText(`Message must be ${ADMIN_MESSAGE_MAX_LENGTH} characters or less.`);
      return;
    }
    setAdminStatus('idle');
    setAdminStatusText('');
    try {
      const result = await sendToAll(trimmed).unwrap();
      setAdminMessage('');
      setAdminStatus('success');
      setAdminStatusText(`Sent to ${result.sentCount} user${result.sentCount === 1 ? '' : 's'}.`);
    } catch (err: any) {
      const msg = err?.data?.error || err?.error || 'Failed to send. Try again.';
      setAdminStatus('error');
      setAdminStatusText(msg);
    }
  }, [adminMessage, isSendingToAll, sendToAll]);

  const styles = createStyles(colors);
  const validationErr = validateHandle(handle);
  const canSubmit = !validationErr && handle.trim().length >= MIN_LENGTH && !isLoading;
  const canSendToAll = adminMessage.trim().length > 0 && adminMessage.trim().length <= ADMIN_MESSAGE_MAX_LENGTH && !isSendingToAll;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['landscape-left', 'landscape-right']}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.primary, borderColor: colors.secondary }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Search User</Text>
              {isAdmin && (
                <View style={styles.adminSection}>
                  <Text style={[styles.adminSectionTitle, { color: colors.text.primary }]}>Message all users</Text>
                  <Text style={[styles.adminSectionHint, { color: colors.text.secondary }]}>
                    One-way admin message (replies disabled). {ADMIN_MESSAGE_MAX_LENGTH} chars max.
                  </Text>
                  <TextInput
                    style={[
                      styles.adminInput,
                      {
                        color: colors.text.primary,
                        borderColor: colors.matrix,
                        backgroundColor: colors.inputBg || colors.background,
                      },
                    ]}
                    value={adminMessage}
                    onChangeText={(text) => {
                      if (text.length <= ADMIN_MESSAGE_MAX_LENGTH) setAdminMessage(text);
                      setAdminStatus('idle');
                    }}
                    placeholder="Type your message..."
                    placeholderTextColor={colors.text.placeholder}
                    multiline
                    maxLength={ADMIN_MESSAGE_MAX_LENGTH}
                    editable={!isSendingToAll}
                  />
                  <Text style={[styles.adminCharCount, { color: colors.text.secondary }]}>
                    {adminMessage.length} / {ADMIN_MESSAGE_MAX_LENGTH}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.sendToAllButton,
                      {
                        backgroundColor: canSendToAll ? colors.primary : colors.buttonDisabled,
                        borderColor: colors.matrix,
                      },
                    ]}
                    onPress={handleSendToAll}
                    disabled={!canSendToAll}
                  >
                    <Text style={styles.sendToAllButtonText}>
                      {isSendingToAll ? 'Sending...' : 'Send to all users'}
                    </Text>
                  </TouchableOpacity>
                  {adminStatus === 'success' && (
                    <Text style={[styles.adminStatusText, { color: colors.primary }]}>{adminStatusText}</Text>
                  )}
                  {adminStatus === 'error' && (
                    <Text style={[styles.adminStatusText, { color: colors.error }]}>{adminStatusText}</Text>
                  )}
                </View>
              )}
              <Text style={styles.hint}>Enter the exact handle (case doesn't matter).</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text.primary,
                    borderColor: error ? colors.error : colors.matrix,
                    backgroundColor: colors.inputBg || colors.background,
                  },
                ]}
                value={handle}
                onChangeText={handleTextChange}
                placeholder="Handle..."
                placeholderTextColor={colors.text.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={MAX_LENGTH}
                editable={!isLoading}
              />
              {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.text.secondary }]}
                  onPress={handleClose}
                  disabled={isLoading}
                >
                  <Text style={[styles.cancelText, { color: colors.text.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor: canSubmit ? colors.buttonBg : colors.buttonDisabled,
                      borderColor: colors.matrix,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={!canSubmit || isLoading}
                >
                  <Text style={styles.submitText}>{isLoading ? 'Searching...' : 'Search'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: SIZING.spacing.lg,
      borderWidth: 1,
      borderColor: colors.secondary,
      minWidth: 260,
    },
    closeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 22,
      borderWidth: 2,
      zIndex: 1000,
    },
    closeButtonText: {
      fontSize: 28,
      marginTop: -2,
    },
    title: {
      color: colors.text.primary,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: SIZING.spacing.xs,
    },
    hint: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      textAlign: 'center',
      marginBottom: SIZING.spacing.md,
    },
    adminSection: {
      marginBottom: SIZING.spacing.md,
      paddingBottom: SIZING.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    adminSectionTitle: {
      fontSize: SIZING.font.md,
      fontWeight: '600',
      marginBottom: SIZING.spacing.xs,
    },
    adminSectionHint: {
      fontSize: SIZING.font.small,
      marginBottom: SIZING.spacing.sm,
    },
    adminInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: SIZING.spacing.md,
      paddingVertical: SIZING.spacing.sm,
      fontSize: SIZING.font.body,
      minHeight: 60,
      maxHeight: 120,
    },
    adminCharCount: {
      fontSize: SIZING.font.small,
      textAlign: 'right',
      marginTop: 2,
      marginBottom: SIZING.spacing.sm,
    },
    sendToAllButton: {
      paddingVertical: SIZING.spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    sendToAllButtonText: {
      color: '#FFFFFF',
      fontSize: SIZING.font.body,
      fontWeight: '600',
    },
    adminStatusText: {
      fontSize: SIZING.font.small,
      marginTop: SIZING.spacing.sm,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: SIZING.spacing.md,
      paddingVertical: SIZING.spacing.sm,
      fontSize: SIZING.font.body,
      marginBottom: SIZING.spacing.sm,
    },
    errorText: {
      fontSize: SIZING.font.small,
      marginBottom: SIZING.spacing.sm,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SIZING.spacing.md,
      marginTop: SIZING.spacing.sm,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: SIZING.spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: SIZING.font.body,
      fontWeight: '600',
    },
    submitButton: {
      flex: 1,
      paddingVertical: SIZING.spacing.md,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    submitText: {
      color: '#FFFFFF',
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
  });
