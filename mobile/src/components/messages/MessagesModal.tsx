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
  Alert,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import {
  useGetConversationsQuery,
  useGetThreadQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  useDeleteConversationMutation,
  type PMConversation,
  type PMMessage,
} from '../../store/api/privateMessagesApi';
import { BaseChatModal, ChatMessageForModal } from '../hackMap/BaseChatModal';
import { useAppSelector } from '../../store/hooks';
import {
  PROBE_REPORT_SENDER_ID,
  BATTLE_REPORT_SENDER_ID,
  SYSTEM_NOTIFICATION_SENDER_ID,
} from '../../constants/systemSenders';

interface MessagesModalProps {
  visible: boolean;
  onClose: () => void;
  /** When set, open directly to conversation with this user (e.g. from profile "Message" button). */
  openToUserId?: string | null;
  openToUsername?: string | null;
  /** Same as World Chat: tap Battle Report / shared location to open Hack Map on that cell (from Turf). */
  onNavigateToMapCell?: (target: { mapName: string; x: number; y: number }) => void;
  /** Battle Report `battleId` present: open replay viewer (R4). */
  onWatchBattle?: (battleId: string) => void;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  visible,
  onClose,
  openToUserId,
  openToUsername,
  onNavigateToMapCell,
  onWatchBattle,
}) => {
  const colors = useThemeColors();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [view, setView] = useState<
    'inbox' | { otherUserId: string; otherUsername: string; isBroadcast?: boolean }
  >('inbox');

  const { data: conversationsData, isLoading: isLoadingConversations, error: conversationsError } = useGetConversationsQuery(undefined, {
    skip: !visible,
    pollingInterval: visible ? 2000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const conversations = conversationsData?.conversations ?? [];

  const otherUserId = view === 'inbox' ? (openToUserId ?? null) : view.otherUserId;
  const otherUsername = view === 'inbox' ? (openToUsername ?? null) : view.otherUsername;
  const isBroadcast = view !== 'inbox' && view.isBroadcast === true;
  /** Only use broadcastOnly for real admin announcements; Probe Report and Battle Report threads must fetch normal PMs. */
  const threadBroadcastOnly =
    isBroadcast &&
    otherUserId !== PROBE_REPORT_SENDER_ID &&
    otherUserId !== BATTLE_REPORT_SENDER_ID &&
    otherUserId !== SYSTEM_NOTIFICATION_SENDER_ID;

  const { data: threadData, isLoading: isLoadingThread, error: threadError } = useGetThreadQuery(
    { otherUserId: otherUserId!, broadcastOnly: threadBroadcastOnly },
    {
      skip: !visible || !otherUserId,
      pollingInterval: visible && otherUserId ? 2000 : 0,
    },
  );
  const [markRead] = useMarkConversationReadMutation();
  const [deleteConversation] = useDeleteConversationMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const broadcastOnlyForDelete = useCallback((c: PMConversation) => {
    return (
      c.isBroadcast === true &&
      c.otherUserId !== PROBE_REPORT_SENDER_ID &&
      c.otherUserId !== BATTLE_REPORT_SENDER_ID &&
      c.otherUserId !== SYSTEM_NOTIFICATION_SENDER_ID
    );
  }, []);

  const promptDeleteConversation = useCallback(
    (c: PMConversation) => {
      Alert.alert(
        'Remove conversation',
        'Remove this from your inbox. Messages stay for the other person until they remove it too (then the thread is deleted from the server).',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              deleteConversation({
                otherUserId: c.otherUserId,
                broadcastOnly: broadcastOnlyForDelete(c),
              })
                .unwrap()
                .catch((err: unknown) => {
                  console.warn('Delete conversation failed:', err);
                  let detail = 'Could not remove conversation. Try again.';
                  if (typeof err === 'object' && err !== null) {
                    const r = err as Record<string, unknown>;
                    const data = r.data;
                    if (typeof data === 'string') detail = data;
                    else if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
                      detail = (data as { message: string }).message;
                    } else if (typeof r.message === 'string' && r.message) {
                      detail = r.message;
                    }
                  }
                  Alert.alert('Remove failed', detail);
                });
            },
          },
        ]
      );
    },
    [deleteConversation, broadcastOnlyForDelete]
  );

  const messages: ChatMessageForModal[] = (threadData?.messages ?? []).map((msg: PMMessage) => ({
    id: msg.id,
    userId: msg.senderId,
    username: msg.isFromAdmin ? 'Admin' : msg.senderUsername,
    message: msg.message,
    timestamp: new Date(msg.timestamp),
    isFromAdmin: msg.isFromAdmin,
    isAdminBroadcast: msg.isAdminBroadcast,
  }));

  const canReply =
    !isBroadcast &&
    otherUserId !== PROBE_REPORT_SENDER_ID &&
    otherUserId !== BATTLE_REPORT_SENDER_ID &&
    otherUserId !== SYSTEM_NOTIFICATION_SENDER_ID;

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

  const openConversation = useCallback(
    (c: PMConversation) => {
      setView({
        otherUserId: c.otherUserId,
        otherUsername: c.otherUsername,
        isBroadcast: c.isBroadcast === true,
      });
      markRead({
        otherUserId: c.otherUserId,
        broadcastOnly:
          c.isBroadcast === true &&
          c.otherUserId !== PROBE_REPORT_SENDER_ID &&
          c.otherUserId !== BATTLE_REPORT_SENDER_ID &&
          c.otherUserId !== SYSTEM_NOTIFICATION_SENDER_ID,
      });
    },
    [markRead],
  );

  const backToInbox = useCallback(() => {
    setView('inbox');
  }, []);

  const handleClose = useCallback(() => {
    setView('inbox');
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    if (!visible) {
      setView('inbox');
      return;
    }
    if (openToUserId) {
      setView({
        otherUserId: openToUserId,
        otherUsername: openToUsername ?? 'Unknown',
        isBroadcast: false,
      });
      markRead({ otherUserId: openToUserId, broadcastOnly: false });
    }
  }, [visible, openToUserId, openToUsername, markRead]);

  const showInbox = view === 'inbox' && !openToUserId;
  const showConversation = !showInbox && otherUserId;

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
            {conversationsError && conversations.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyText}>Couldn't load conversations.</Text>
                <Text style={styles.emptySubtext}>Please try again later.</Text>
              </View>
            ) : isLoadingConversations && conversations.length === 0 ? (
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
                keyExtractor={(item) => `${item.otherUserId}${item.isBroadcast ? ':broadcast' : ''}`}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.row}
                    onPress={() => openConversation(item)}
                    onLongPress={() => promptDeleteConversation(item)}
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
          fetchError={threadError ?? null}
          isLoadingMessages={isLoadingThread && messages.length === 0}
          onSendMessage={onSendMessage}
          isSending={isSending}
          currentUser={currentUser}
          reportContext="private-message"
          getReportContextData={getReportContextData}
          canReply={canReply}
          onNavigateToMapCell={onNavigateToMapCell}
          onWatchBattle={onWatchBattle}
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
      color: colors.text.primary,
    },
    closeButtonText: {
      fontSize: 28,
      fontWeight: '600',
      color: colors.text.primary,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SIZING.spacing.lg,
    },
    emptyText: {
      fontSize: SIZING.font.md,
      color: colors.text.primary,
    },
    emptySubtext: {
      fontSize: SIZING.font.small,
      color: colors.text.secondary,
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
      color: colors.text.primary,
    },
    rowPreview: {
      fontSize: SIZING.font.small,
      color: colors.text.secondary,
      marginTop: 2,
    },
    rowRight: {
      alignItems: 'flex-end',
      marginLeft: SIZING.spacing.sm,
    },
    rowTime: {
      fontSize: SIZING.font.small,
      color: colors.text.secondary,
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
