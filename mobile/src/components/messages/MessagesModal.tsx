import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import {
  useGetConversationsQuery,
  useGetThreadQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  type PMConversation,
  type PMMessage,
} from '../../store/api/privateMessagesApi';
import { BaseChatModal, ChatMessageForModal } from '../hackMap/BaseChatModal';
import { useAppSelector } from '../../store/hooks';

interface MessagesModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, open directly to conversation with this user (e.g. from profile "Message" button). */
  openToUserId?: string | null;
  openToUsername?: string | null;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  visible,
  onClose,
  openToUserId,
  openToUsername,
}) => {
  const colors = useThemeColors();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [view, setView] = useState<'inbox' | { otherUserId: string; otherUsername: string }>('inbox');

  const { data: conversationsData, isLoading: isLoadingConversations } = useGetConversationsQuery(undefined, {
    skip: !visible,
    pollingInterval: visible ? 5000 : 0,
  });
  const conversations = conversationsData?.conversations ?? [];

  const otherUserId = view === 'inbox' ? (openToUserId ?? null) : view.otherUserId;
  const otherUsername = view === 'inbox' ? (openToUsername ?? null) : view.otherUsername;

  const { data: threadData, isLoading: isLoadingThread } = useGetThreadQuery(otherUserId!, {
    skip: !visible || !otherUserId,
    pollingInterval: visible && otherUserId ? 5000 : 0,
  });
  const [markRead] = useMarkConversationReadMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const messages: ChatMessageForModal[] = (threadData?.messages ?? []).map((msg: PMMessage) => ({
    id: msg.id,
    userId: msg.senderId,
    username: msg.isFromAdmin ? 'Admin' : msg.senderUsername,
    message: msg.message,
    timestamp: new Date(msg.timestamp),
    isFromAdmin: msg.isFromAdmin,
  }));

  const onSendMessage = useCallback(
    async (trimmedMessage: string) => {
      if (!otherUserId) throw new Error('recipient required');
      await sendMessage({ recipientId: otherUserId, message: trimmedMessage }).unwrap();
    },
    [otherUserId, sendMessage],
  );

  const getReportContextData = useCallback(
    (reportedMessage: ChatMessageForModal) => ({
      message: reportedMessage.message,
      messageId: reportedMessage.id,
      timestamp:
        reportedMessage.timestamp instanceof Date
          ? reportedMessage.timestamp.toISOString()
          : new Date(reportedMessage.timestamp).toISOString(),
      recipientId: otherUserId,
      senderId: reportedMessage.userId,
    }),
    [otherUserId],
  );

  const openConversation = useCallback((c: PMConversation) => {
    setView({ otherUserId: c.otherUserId, otherUsername: c.otherUsername });
    markRead(c.otherUserId);
  }, [markRead]);

  const backToInbox = useCallback(() => {
    setView('inbox');
  }, []);

  const handleClose = useCallback(() => {
    if (__DEV__) console.log('[MessagesModal] handleClose — dismissing');
    setView('inbox');
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (visible && openToUserId) {
      setView({
        otherUserId: openToUserId,
        otherUsername: openToUsername ?? 'Unknown',
      });
      markRead(openToUserId);
    }
  }, [visible, openToUserId, openToUsername, markRead]);

  const showInbox = view === 'inbox' && !openToUserId;
  const showConversation = !showInbox && otherUserId;

  React.useEffect(() => {
    if (__DEV__ && visible && openToUserId) {
      console.log('[MessagesModal] showing conversation for', openToUserId, openToUsername ?? 'Unknown');
    }
  }, [visible, openToUserId, openToUsername]);

  const styles = createStyles(colors);

  // Render only one Modal at a time so "view inbox" and "write to user" don't interfere (iOS can show only one).
  return (
    <>
      {showInbox && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={handleClose}
          statusBarTranslucent
          presentationStyle="overFullScreen"
          supportedOrientations={['landscape-left', 'landscape-right']}
        >
          <SafeAreaView style={styles.overlay}>
            <View style={styles.header}>
              <Text style={styles.title}>Messages</Text>
              <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Close">
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {isLoadingConversations && conversations.length === 0 ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : conversations.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No conversations yet.</Text>
                <Text style={styles.emptySubtext}>Message someone from their profile to start.</Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.otherUserId}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.row}
                    onPress={() => openConversation(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Conversation with ${item.otherUsername}`}
                  >
                    <View style={styles.rowContent}>
                      <Text style={styles.rowUsername} numberOfLines={1}>{item.otherUsername}</Text>
                      <Text style={styles.rowPreview} numberOfLines={1}>{item.lastMessage}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      {item.unreadCount > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                        </View>
                      )}
                      <Text style={styles.rowTime}>
                        {formatTime(item.lastAt)}
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </SafeAreaView>
        </Modal>
      )}

      {showConversation && (
        <BaseChatModal
          visible={visible}
          onClose={openToUserId ? handleClose : backToInbox}
          title={otherUsername ?? 'Conversation'}
          messages={messages}
          fetchError={null}
          isLoadingMessages={isLoadingThread && messages.length === 0}
          onSendMessage={onSendMessage}
          isSending={isSending}
          currentUser={currentUser}
          reportContext="private-message"
          getReportContextData={getReportContextData}
        />
      )}
    </>
  );
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

// High-contrast text colors for Messages modal so title, close button, and list are always readable on dark background
const MODAL_TEXT_PRIMARY = '#E8E4D9';
const MODAL_TEXT_SECONDARY = '#B0A8C0';

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SIZING.spacing.md,
      paddingVertical: SIZING.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: SIZING.font.lg,
      fontWeight: '600',
      color: MODAL_TEXT_PRIMARY,
    },
    closeButtonText: {
      fontSize: 28,
      fontWeight: '600',
      color: MODAL_TEXT_PRIMARY,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SIZING.spacing.lg,
    },
    emptyText: {
      fontSize: SIZING.font.md,
      color: MODAL_TEXT_PRIMARY,
    },
    emptySubtext: {
      fontSize: SIZING.font.small,
      color: MODAL_TEXT_SECONDARY,
      marginTop: SIZING.spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SIZING.spacing.md,
      paddingVertical: SIZING.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowContent: {
      flex: 1,
      minWidth: 0,
    },
    rowUsername: {
      fontSize: SIZING.font.md,
      fontWeight: '600',
      color: MODAL_TEXT_PRIMARY,
    },
    rowPreview: {
      fontSize: SIZING.font.small,
      color: MODAL_TEXT_SECONDARY,
      marginTop: 2,
    },
    rowRight: {
      alignItems: 'flex-end',
      marginLeft: SIZING.spacing.sm,
    },
    rowTime: {
      fontSize: SIZING.font.small,
      color: MODAL_TEXT_SECONDARY,
    },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
  });
