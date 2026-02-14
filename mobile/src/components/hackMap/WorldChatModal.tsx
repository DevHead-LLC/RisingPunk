import React, { useCallback } from 'react';
import { useAppSelector } from '../../store/hooks';
import { useGetMapChatMessagesQuery, useSendMapChatMessageMutation } from '../../store/api/mapApi';
import { BaseChatModal, ChatMessageForModal } from './BaseChatModal';

interface WorldChatModalProps {
  visible: boolean;
  onClose: () => void;
  mapName: string;
}

export const WorldChatModal: React.FC<WorldChatModalProps> = ({
  visible,
  onClose,
  mapName,
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);

  const { data: chatData, error: fetchError, isLoading: isLoadingMessages } = useGetMapChatMessagesQuery(mapName, {
    skip: !visible || !mapName,
    pollingInterval: visible ? 15000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const [sendMessage, { isLoading: isSending }] = useSendMapChatMessageMutation();

  const messages: ChatMessageForModal[] = (chatData?.messages?.map((msg) => ({
    id: msg.id,
    userId: msg.userId,
    username: msg.username,
    message: msg.message,
    timestamp: new Date(msg.timestamp),
  })) || []);

  const onSendMessage = useCallback(
    async (trimmedMessage: string) => {
      if (!mapName) throw new Error('mapName required');
      await sendMessage({ mapName, message: trimmedMessage }).unwrap();
    },
    [mapName, sendMessage],
  );

  const getReportContextData = useCallback(
    (reportedMessage: ChatMessageForModal) => ({
      message: reportedMessage.message,
      messageId: reportedMessage.id,
      timestamp:
        reportedMessage.timestamp instanceof Date
          ? reportedMessage.timestamp.toISOString()
          : new Date(reportedMessage.timestamp).toISOString(),
      mapName,
    }),
    [mapName],
  );

  return (
    <BaseChatModal
      visible={visible}
      onClose={onClose}
      title="World Chat"
      messages={messages}
      fetchError={fetchError}
      isLoadingMessages={isLoadingMessages}
      onSendMessage={onSendMessage}
      isSending={isSending}
      currentUser={currentUser}
      reportContext="map-chat-message"
      getReportContextData={getReportContextData}
    />
  );
};
