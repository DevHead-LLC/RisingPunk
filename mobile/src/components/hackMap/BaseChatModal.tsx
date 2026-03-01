/**
 * Shared chat modal UI for Crew Chat and World Chat (Bugbot: single source for scroll, report, input, styling).
 * Parameterized by title, messages data, send callback, and report context so callers only wire their API hooks.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { FilteredTextInput } from '../common/FilteredTextInput';
import { FilteredText } from '../common/FilteredText';
import { UserReportModal } from '../modals/UserReportModal';
import { PROBE_REPORT_SENDER_ID } from '../../constants/systemSenders';

const PROBE_REPORT_PREFIX = 'PRB|';

export interface ProbeReportPayload {
  pr: 1;
  n: string;
  t: 'player' | 'npc';
  l: number;
  x: number;
  y: number;
  b: { breacher: number; guardian: number; phreak: number };
}

function parseProbeReportMessage(message: string): ProbeReportPayload | null {
  if (!message.startsWith(PROBE_REPORT_PREFIX)) return null;
  try {
    const json = message.slice(PROBE_REPORT_PREFIX.length);
    const payload = JSON.parse(json) as ProbeReportPayload;
    if (payload?.pr === 1 && payload.n != null && payload.b) return payload;
  } catch (_) {
    // ignore
  }
  return null;
}

export interface ChatMessageForModal {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  /** When true, show as "Admin" (or "You (Admin)" if current user). Set by server for world/crew/PM. */
  isFromAdmin?: boolean;
  /** When true, message was sent via admin "message all"; replies are disabled for this conversation. */
  isAdminBroadcast?: boolean;
}

export interface BaseChatModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  messages: ChatMessageForModal[];
  fetchError: unknown;
  isLoadingMessages: boolean;
  onSendMessage: (trimmedMessage: string) => Promise<void>;
  isSending: boolean;
  currentUser: { _id?: string; id?: string; handle?: string; isAdmin?: boolean } | null;
  reportContext: string;
  getReportContextData: (reportedMessage: ChatMessageForModal) => Record<string, unknown>;
  /** When false, input is hidden (e.g. admin broadcast conversation). Default true. */
  canReply?: boolean;
}

export const BaseChatModal: React.FC<BaseChatModalProps> = ({
  visible,
  onClose,
  title,
  messages,
  fetchError,
  isLoadingMessages,
  onSendMessage,
  isSending,
  currentUser,
  reportContext,
  getReportContextData,
  canReply = true,
}) => {
  const colors = useThemeColors();
  const currentUserId = currentUser?._id || (currentUser as any)?.id;

  const [messageInput, setMessageInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedMessage, setReportedMessage] = useState<ChatMessageForModal | null>(null);

  const maxCharacters = 500;
  const characterCount = messageInput.length;

  const hasScrolledOnOpen = useRef(false);
  const lastVisibleState = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const SCROLL_BOTTOM_THRESHOLD = 60;
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    if (!visible && lastVisibleState.current) {
      hasScrolledOnOpen.current = false;
      prevMessagesLengthRef.current = 0;
      isAtBottomRef.current = true;
      setShowReportModal(false);
      setReportedMessage(null);
    }
    lastVisibleState.current = visible;
  }, [visible]);

  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    if (messages.length > prevLen && isAtBottomRef.current && visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, visible]);

  const updateAtBottomFromScrollEvent = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    try {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      if (contentSize.height <= 0) return;
      const atBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_BOTTOM_THRESHOLD;
      isAtBottomRef.current = atBottom;
    } catch (_) {
      // ignore
    }
  }, []);

  const handleSendMessage = async () => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage || !currentUserId || isSending) return;
    try {
      await onSendMessage(trimmedMessage);
      setMessageInput('');
      Keyboard.dismiss();
      isAtBottomRef.current = true;
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (_) {
      // Caller's onSendMessage may throw; mutation exposes error state if needed
    }
  };

  const handleClose = useCallback(() => {
    if (__DEV__) console.log('[BaseChatModal] close (×) pressed');
    setMessageInput('');
    setShowReportModal(false);
    setReportedMessage(null);
    onClose();
  }, [onClose]);

  const isCurrentUser = useCallback(
    (userId: string) => {
      if (!userId || !currentUser || !currentUserId) return false;
      const currentIdStr = String(currentUserId).trim();
      const messageIdStr = String(userId).trim();
      const currentIdAlt = String(currentUser._id || (currentUser as any)?.id || '').trim();
      return currentIdStr === messageIdStr || currentIdAlt === messageIdStr;
    },
    [currentUserId, currentUser],
  );

  const handleReportMessage = (message: ChatMessageForModal) => {
    if (isCurrentUser(message.userId)) return;
    const timestamp =
      message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
    setReportedMessage({
      id: message.id,
      userId: message.userId,
      username: message.username,
      message: message.message,
      timestamp,
    });
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportedMessage(null);
  };

  const styles = createStyles(colors);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
        hardwareAccelerated
        supportedOrientations={['landscape-left', 'landscape-right']}
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalRoot}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <SafeAreaView style={styles.chatModalContainer}>
            <View style={styles.header} pointerEvents="box-none">
              <Text style={styles.title}>{title}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              scrollEnabled
              onScrollEndDrag={updateAtBottomFromScrollEvent}
              onMomentumScrollEnd={updateAtBottomFromScrollEvent}
              onContentSizeChange={() => {
                if (
                  visible &&
                  !hasScrolledOnOpen.current &&
                  messages.length > 0 &&
                  !isLoadingMessages
                ) {
                  hasScrolledOnOpen.current = true;
                  isAtBottomRef.current = true;
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: false });
                  }, 50);
                }
              }}
            >
              {fetchError ? (
                <View style={styles.errorState}>
                  <Text style={styles.errorStateText}>Error loading messages. Please try again.</Text>
                  <Text
                    style={[styles.errorStateText, { fontSize: SIZING.font.small, marginTop: SIZING.spacing.xs }]}
                  >
                    {('data' in (fetchError || {}) && (fetchError as any)?.data?.error) ||
                      ('error' in (fetchError || {}) && (fetchError as any)?.error) ||
                      'Unknown error'}
                  </Text>
                </View>
              ) : isLoadingMessages && messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Loading messages...</Text>
                </View>
              ) : messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No messages yet. Start the conversation!</Text>
                </View>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = isCurrentUser(message.userId);
                  const displayName = isOwnMessage
                    ? (currentUser?.isAdmin ? 'You (Admin)' : 'You')
                    : (message.isFromAdmin ? 'Admin' : message.username);
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageWrapper,
                        isOwnMessage ? styles.messageWrapperRight : styles.messageWrapperLeft,
                      ]}
                    >
                      <Text
                        style={[
                          styles.usernameText,
                          isOwnMessage ? styles.usernameTextRight : styles.usernameTextLeft,
                        ]}
                      >
                        {displayName}
                      </Text>
                      <View style={styles.messageBubbleWrapper}>
                        <View
                          style={[
                            styles.messageBubble,
                            isOwnMessage ? styles.messageBubbleRight : styles.messageBubbleLeft,
                          ]}
                        >
                          {message.userId === PROBE_REPORT_SENDER_ID ? (() => {
                            const report = parseProbeReportMessage(message.message);
                            if (!report) {
                              return (
                                <FilteredText
                                  style={[
                                    styles.messageText,
                                    isOwnMessage ? styles.messageTextRight : styles.messageTextLeft,
                                  ]}
                                >
                                  {message.message}
                                </FilteredText>
                              );
                            }
                            return (
                              <View style={styles.probeReportBlock}>
                                <Text style={[styles.probeReportTitle, { color: colors.text.primary }]}>
                                  Probe Report
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  Target: {report.n} ({report.t === 'npc' ? 'NPC' : 'Player'}) | Level: {report.l} | Map: ({report.x}, {report.y})
                                </Text>
                                <Text style={[styles.messageText, styles.probeReportLine, { color: colors.text.primary }]}>
                                  Breacher: {report.b.breacher} · Guardian: {report.b.guardian} · Phreak: {report.b.phreak}
                                </Text>
                              </View>
                            );
                          })() : (
                            <FilteredText
                              style={[
                                styles.messageText,
                                isOwnMessage ? styles.messageTextRight : styles.messageTextLeft,
                              ]}
                            >
                              {message.message}
                            </FilteredText>
                          )}
                        </View>
                        {!isOwnMessage && (
                          <TouchableOpacity
                            onPress={() => handleReportMessage(message)}
                            activeOpacity={0.7}
                            style={[styles.reportButton, { backgroundColor: colors.background + 'E6' }]}
                          >
                            <Text style={[styles.reportButtonText, { color: colors.text.secondary }]}>
                              Report
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.timestampText,
                          isOwnMessage ? styles.timestampTextRight : styles.timestampTextLeft,
                        ]}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {canReply ? (
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <FilteredTextInput
                    style={[
                      styles.messageInput,
                      {
                        borderColor:
                          characterCount > maxCharacters ? colors.error : colors.secondary,
                        backgroundColor: colors.inputBg || colors.surface,
                        color: colors.text.primary,
                      },
                    ]}
                    value={messageInput}
                    onChangeText={setMessageInput}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.text.placeholder}
                    multiline
                    maxLength={maxCharacters}
                    textAlignVertical="top"
                  />
                  <Text style={styles.characterCount}>
                    {characterCount} / {maxCharacters}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: colors.primary, borderColor: colors.primary },
                    (characterCount > maxCharacters || !messageInput.trim()) && {
                      backgroundColor: colors.buttonDisabled,
                      borderColor: colors.buttonDisabled,
                    },
                  ]}
                  onPress={handleSendMessage}
                  disabled={
                    characterCount > maxCharacters || !messageInput.trim() || isSending
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noReplyContainer}>
                <Text style={[styles.noReplyText, { color: colors.text.secondary }]}>
                  Admin message — replies are disabled.
                </Text>
              </View>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>

        {currentUser && reportedMessage && showReportModal && (
          <UserReportModal
            visible={showReportModal}
            onClose={handleCloseReportModal}
            reportedUserId={reportedMessage.userId}
            reportedUsername={reportedMessage.username}
            reportingUserId={String(currentUser._id || (currentUser as any)?.id || '')}
            reportingUsername={currentUser.handle || 'Unknown'}
            context={reportContext}
            contextData={getReportContextData(reportedMessage)}
            maxDescriptionLength={1000}
            renderAsOverlay
          />
        )}
        </View>
      </Modal>
    </>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      zIndex: 99999,
      elevation: 99999,
    },
    overlay: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.background,
    },
    chatModalContainer: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SIZING.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.secondary,
    },
    title: {
      color: colors.text.primary,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      borderColor: colors.secondary,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: SIZING.spacing.md,
    },
    closeButtonText: {
      color: colors.background,
      fontSize: 28,
      marginTop: -2,
      fontWeight: 'bold',
    },
    messagesContainer: { flex: 1 },
    messagesContent: {
      padding: SIZING.spacing.md,
      paddingBottom: SIZING.spacing.lg,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SIZING.spacing.lg * 2,
    },
    emptyStateText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.body,
      textAlign: 'center',
    },
    errorState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SIZING.spacing.lg * 2,
    },
    errorStateText: {
      color: colors.error,
      fontSize: SIZING.font.body,
      textAlign: 'center',
    },
    messageWrapper: {
      marginBottom: SIZING.spacing.lg,
      maxWidth: '75%',
    },
    messageWrapperLeft: { alignSelf: 'flex-start', paddingRight: SIZING.spacing.lg },
    messageWrapperRight: { alignSelf: 'flex-end', paddingLeft: SIZING.spacing.lg },
    messageBubbleWrapper: { position: 'relative' },
    usernameText: {
      fontSize: SIZING.font.small,
      fontWeight: '600',
      marginBottom: SIZING.spacing.xs,
    },
    usernameTextLeft: { color: colors.text.secondary, textAlign: 'left' },
    usernameTextRight: {
      color: colors.primary,
      textAlign: 'right',
      fontWeight: '700',
    },
    messageBubble: {
      borderRadius: 12,
      padding: SIZING.spacing.md,
      borderWidth: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    messageBubbleLeft: { backgroundColor: colors.surface, borderColor: colors.secondary },
    messageBubbleRight: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderWidth: 2,
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    messageText: { fontSize: SIZING.font.body, lineHeight: SIZING.font.body + 4 },
    probeReportBlock: { gap: 4 },
    probeReportTitle: { fontSize: SIZING.font.body, fontWeight: '600', marginBottom: 2 },
    probeReportLine: { fontSize: SIZING.font.body, lineHeight: SIZING.font.body + 4 },
    reportButton: {
      position: 'absolute',
      bottom: -3,
      right: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    reportButtonText: { fontSize: SIZING.font.small - 5, fontWeight: '500' },
    messageTextLeft: { color: colors.text.primary },
    messageTextRight: { color: colors.background, fontWeight: '500' },
    timestampText: {
      fontSize: SIZING.font.small - 2,
      marginTop: SIZING.spacing.xs / 2,
      opacity: 0.6,
    },
    timestampTextLeft: { color: colors.text.secondary, textAlign: 'left' },
    timestampTextRight: { color: colors.primary, textAlign: 'right' },
    inputContainer: {
      flexDirection: 'row',
      padding: SIZING.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.secondary,
      gap: SIZING.spacing.md,
      paddingBottom: Platform.OS === 'ios' ? SIZING.spacing.lg : SIZING.spacing.md,
    },
    noReplyContainer: {
      padding: SIZING.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.secondary,
      alignItems: 'center',
    },
    noReplyText: {
      fontSize: SIZING.font.small,
      fontStyle: 'italic',
    },
    inputWrapper: { flex: 1 },
    messageInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: SIZING.spacing.md,
      fontSize: SIZING.font.body,
      minHeight: 44,
      maxHeight: 100,
    },
    characterCount: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      textAlign: 'right',
      marginTop: SIZING.spacing.xs,
    },
    sendButton: {
      paddingHorizontal: SIZING.spacing.lg,
      paddingVertical: SIZING.spacing.md,
      borderRadius: 8,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 80,
    },
    sendButtonText: {
      color: colors.background,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
  });
