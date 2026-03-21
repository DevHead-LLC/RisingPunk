import React, { useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useGetCrewChatMessagesQuery, useSendCrewChatMessageMutation } from '../../store/api/authApi';
import { BaseChatModal, ChatMessageForModal } from './BaseChatModal';

interface CrewChatModalProps {
  visible: boolean;
  onClose: () => void;
  crewId: string;
  onNavigateToMapCell?: (target: { mapName: string; x: number; y: number }) => void;
}

export const CrewChatModal: React.FC<CrewChatModalProps> = ({
  visible,
  onClose,
  crewId,
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);

  const { data: chatData, error: fetchError, isLoading: isLoadingMessages } = useGetCrewChatMessagesQuery(crewId, {
    skip: !visible || !crewId,
    pollingInterval: visible ? 15000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const [sendMessage, { isLoading: isSending }] = useSendCrewChatMessageMutation();

  const messages: ChatMessageForModal[] = (chatData?.messages?.map((msg) => ({
    id: msg.id,
    userId: msg.userId,
    username: msg.username,
    message: msg.message,
    timestamp: new Date(msg.timestamp),
    isFromAdmin: msg.isFromAdmin,
  })) || []);

  const onSendMessage = useCallback(
    async (trimmedMessage: string) => {
      if (!crewId) throw new Error('crewId required');
      await sendMessage({ crewId, message: trimmedMessage }).unwrap();
    },
    [crewId, sendMessage],
  );

  const getReportContextData = useCallback(
    (reportedMessage: ChatMessageForModal) => ({
      message: reportedMessage.message,
      messageId: reportedMessage.id,
      timestamp:
        reportedMessage.timestamp instanceof Date
          ? reportedMessage.timestamp.toISOString()
          : new Date(reportedMessage.timestamp).toISOString(),
      crewId,
    }),
    [crewId],
  );

  return (
    <BaseChatModal
      visible={visible}
      onClose={onClose}
      title="Crew Chat"
      messages={messages}
      fetchError={fetchError}
      isLoadingMessages={isLoadingMessages}
      onSendMessage={onSendMessage}
      isSending={isSending}
      currentUser={currentUser}
      reportContext="chat-message"
      getReportContextData={getReportContextData}
      onNavigateToMapCell={onNavigateToMapCell}
    />
  );
};
