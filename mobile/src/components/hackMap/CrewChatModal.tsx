import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useAppSelector } from '../../store/hooks';
import { useGetCrewChatMessagesQuery, useSendCrewChatMessageMutation } from '../../store/api/authApi';
import { FilteredTextInput } from '../common/FilteredTextInput';
import { FilteredText } from '../common/FilteredText';
import { UserReportModal } from '../modals/UserReportModal';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  // Note: originalMessage removed - not exposed in API for security
  // Server will look up original content from database when processing reports
  timestamp: Date;
}

interface CrewChatModalProps {
  visible: boolean;
  onClose: () => void;
  crewId: string;
}

export const CrewChatModal: React.FC<CrewChatModalProps> = ({
  visible,
  onClose,
  crewId,
}) => {
  const colors = useThemeColors();
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserId = currentUser?._id || (currentUser as any)?.id;
  const currentUsername = currentUser?.handle || 'You';
  
  console.log('[rp-must-see] CrewChatModal currentUser check', {
    hasCurrentUser: !!currentUser,
    currentUserKeys: currentUser ? Object.keys(currentUser) : [],
    _id: currentUser?._id,
    id: (currentUser as any)?.id,
    currentUserId,
  });

  const [messageInput, setMessageInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedMessage, setReportedMessage] = useState<ChatMessage | null>(null);

  const maxCharacters = 500;
  const characterCount = messageInput.length;

  // Fetch messages with optimized polling strategy
  // Use longer polling interval and rely on RTK Query caching to reduce server load
  // Messages are refetched automatically when a new message is sent (via cache invalidation)
  const { data: chatData, refetch, error: fetchError, isLoading: isLoadingMessages } = useGetCrewChatMessagesQuery(crewId, {
    skip: !visible || !crewId,
    pollingInterval: visible ? 15000 : 0, // Poll every 15 seconds when modal is open (reduced frequency)
    refetchOnMountOrArgChange: true,
  });

  const [sendMessage, { isLoading: isSending, error: sendError }] = useSendCrewChatMessageMutation();

  const messages: ChatMessage[] = chatData?.messages?.map(msg => ({
    id: msg.id,
    userId: msg.userId,
    username: msg.username,
    message: msg.message,
    timestamp: new Date(msg.timestamp),
  })) || [];

  // Track if we've scrolled on this modal open session
  const hasScrolledOnOpen = useRef(false);
  const lastVisibleState = useRef(false);
  
  // Reset scroll flag and report modal state when modal closes
  useEffect(() => {
    if (!visible && lastVisibleState.current) {
      hasScrolledOnOpen.current = false;
      setShowReportModal(false);
      setReportedMessage(null);
    }
    lastVisibleState.current = visible;
  }, [visible]);

  const handleSendMessage = async () => {
    const trimmedMessage = messageInput.trim();
    
    if (!trimmedMessage) {
      return;
    }

    if (!currentUserId) {
      return;
    }

    if (!crewId) {
      return;
    }

    if (isSending) {
      return;
    }

    try {
      await sendMessage({
        crewId,
        message: trimmedMessage,
      }).unwrap();
      
      setMessageInput('');
      Keyboard.dismiss();
    } catch (error: any) {
      // Silent error handling - mutation will show error state if needed
    }
  };

  const handleClose = () => {
    setMessageInput('');
    setShowReportModal(false);
    setReportedMessage(null);
    onClose();
  };

  const isCurrentUser = useCallback((userId: string) => {
    if (!currentUserId || !userId) return false;
    if (!currentUser) return false;
    const currentIdStr = String(currentUserId).trim();
    const messageIdStr = String(userId).trim();
    const currentIdAlt = String(currentUser._id || (currentUser as any)?.id || '').trim();
    return currentIdStr === messageIdStr || currentIdAlt === messageIdStr;
  }, [currentUserId, currentUser]);

  const handleReportMessage = (message: ChatMessage) => {
    console.log('[rp-must-see] handleReportMessage called', {
      messageId: message.id,
      userId: message.userId,
      username: message.username,
      currentUser: !!currentUser,
      currentUserId: currentUserId,
    });
    
    const timestamp = message.timestamp instanceof Date 
      ? message.timestamp 
      : new Date(message.timestamp);
    
    const reportData = {
      id: message.id,
      userId: message.userId,
      username: message.username,
      message: message.message,
      timestamp: timestamp,
    };
    
    console.log('[rp-must-see] Setting reportedMessage state', reportData);
    setReportedMessage(reportData);
    
    console.log('[rp-must-see] Setting showReportModal to true');
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportedMessage(null);
  };

  const styles = createStyles(colors);

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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={styles.chatModalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Crew Chat</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            onContentSizeChange={() => {
              if (visible && !hasScrolledOnOpen.current && messages.length > 0 && !isLoadingMessages) {
                hasScrolledOnOpen.current = true;
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: false });
                }, 50);
              }
            }}
          >
            {fetchError ? (
              <View style={styles.errorState}>
                <Text style={styles.errorStateText}>
                  Error loading messages. Please try again.
                </Text>
                <Text style={[styles.errorStateText, { fontSize: SIZING.font.small, marginTop: SIZING.spacing.xs }]}>
                  {('data' in (fetchError || {}) && (fetchError as any)?.data?.error) || ('error' in (fetchError || {}) && (fetchError as any)?.error) || 'Unknown error'}
                </Text>
              </View>
            ) : isLoadingMessages && messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Loading messages...
                </Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No messages yet. Start the conversation!
                </Text>
              </View>
            ) : (
              messages.map((message) => {
                const isOwnMessage = isCurrentUser(message.userId);
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
                      {isOwnMessage ? 'You' : message.username}
                    </Text>
                    <View style={styles.messageBubbleWrapper}>
                      <View
                        style={[
                          styles.messageBubble,
                          isOwnMessage ? styles.messageBubbleRight : styles.messageBubbleLeft,
                        ]}
                      >
                        <FilteredText
                          style={[
                            styles.messageText,
                            isOwnMessage ? styles.messageTextRight : styles.messageTextLeft,
                          ]}
                        >
                          {message.message}
                        </FilteredText>
                      </View>
                      {!isOwnMessage && (
                        <TouchableOpacity
                          onPress={() => {
                            console.log('[rp-must-see] Report button pressed', {
                              messageId: message.id,
                              userId: message.userId,
                              username: message.username,
                            });
                            handleReportMessage(message);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.reportButton,
                            {
                              backgroundColor: colors.background + 'E6',
                            }
                          ]}
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
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

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
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
                (characterCount > maxCharacters || !messageInput.trim()) && {
                  backgroundColor: colors.buttonDisabled,
                  borderColor: colors.buttonDisabled,
                },
              ]}
              onPress={handleSendMessage}
              disabled={characterCount > maxCharacters || !messageInput.trim() || isSending}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>
                {isSending ? 'Sending...' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {currentUser && reportedMessage && (currentUser._id || (currentUser as any)?.id) && (
        <UserReportModal
          visible={showReportModal}
          onClose={handleCloseReportModal}
          reportedUserId={reportedMessage.userId}
          reportedUsername={reportedMessage.username}
          reportingUserId={String(currentUser._id || (currentUser as any)?.id)}
          reportingUsername={currentUser.handle || 'Unknown'}
          context="chat-message"
          contextData={{
            message: reportedMessage.message,
            messageId: reportedMessage.id,
            timestamp: (reportedMessage.timestamp instanceof Date 
              ? reportedMessage.timestamp 
              : new Date(reportedMessage.timestamp)).toISOString(),
            crewId: crewId,
          }}
          maxDescriptionLength={1000}
        />
      )}
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
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
    messagesContainer: {
      flex: 1,
    },
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
    messageWrapperLeft: {
      alignSelf: 'flex-start',
      paddingRight: SIZING.spacing.lg,
    },
    messageWrapperRight: {
      alignSelf: 'flex-end',
      paddingLeft: SIZING.spacing.lg,
    },
    messageBubbleWrapper: {
      position: 'relative',
    },
    usernameText: {
      fontSize: SIZING.font.small,
      fontWeight: '600',
      marginBottom: SIZING.spacing.xs,
    },
    usernameTextLeft: {
      color: colors.text.secondary,
      textAlign: 'left',
    },
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
    messageBubbleLeft: {
      backgroundColor: colors.surface,
      borderColor: colors.secondary,
    },
    messageBubbleRight: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderWidth: 2,
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    messageText: {
      fontSize: SIZING.font.body,
      lineHeight: SIZING.font.body + 4,
    },
    reportButton: {
      position: 'absolute',
      bottom: -3,
      right: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    },
    reportButtonText: {
      fontSize: SIZING.font.small - 5,
      fontWeight: '500',
    },
    messageTextLeft: {
      color: colors.text.primary,
    },
    messageTextRight: {
      color: colors.background,
      fontWeight: '500',
    },
    timestampText: {
      fontSize: SIZING.font.small - 2,
      marginTop: SIZING.spacing.xs / 2,
      opacity: 0.6,
    },
    timestampTextLeft: {
      color: colors.text.secondary,
      textAlign: 'left',
    },
    timestampTextRight: {
      color: colors.primary,
      textAlign: 'right',
    },
    inputContainer: {
      flexDirection: 'row',
      padding: SIZING.spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.secondary,
      gap: SIZING.spacing.md,
      paddingBottom: Platform.OS === 'ios' ? SIZING.spacing.lg : SIZING.spacing.md,
    },
    inputWrapper: {
      flex: 1,
    },
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

