import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

const privateMessagesBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    if (handle426IfNeeded(result, api)) return result;
    if ((result.error as any)?.status === 401 && (result.error as any)?.data?.error === 'ACCOUNT_SWITCHED') {
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      resetAllApiCaches(api);
      return result;
    }
    if ((result.error as any)?.status === 401 && (result.error as any)?.data?.error === 'Token expired') {
      api.dispatch({ type: 'auth/logout' });
      return result;
    }
    const err = result.error as { status?: number; originalStatus?: number };
    const is404 = err?.status === 404 || err?.originalStatus === 404;
    if (!is404) {
      globalErrorHandler.handleDatabaseError(result.error);
    }
  } else {
    globalErrorHandler.markServerReachable();
  }
  return result;
};

export interface PMConversation {
  otherUserId: string;
  otherUsername: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
  /** True for "RisingPunk (Announcements)" thread; replies disabled. */
  isBroadcast?: boolean;
}

export interface PMMessage {
  id: string;
  senderId: string;
  recipientId: string;
  senderUsername: string;
  message: string;
  timestamp: string;
  readAt: string | null;
  isFromAdmin: boolean;
  /** When true, this was sent via admin "message all"; replies are disabled. */
  isAdminBroadcast?: boolean;
}

export const privateMessagesApi = createApi({
  reducerPath: 'privateMessagesApi',
  baseQuery: privateMessagesBaseQuery,
  tagTypes: ['PrivateMessageConversations', 'PrivateMessageThread'],
  endpoints: (builder) => ({
    getConversations: builder.query<{ success: boolean; conversations: PMConversation[] }, void>({
      query: () => ({ url: '/api/private-messages/conversations' }),
      providesTags: ['PrivateMessageConversations'],
    }),
    getThread: builder.query<
      { success: boolean; messages: PMMessage[] },
      { otherUserId: string; broadcastOnly?: boolean }
    >({
      query: ({ otherUserId, broadcastOnly }) => ({
        url: `/api/private-messages/conversations/${encodeURIComponent(otherUserId)}/messages${broadcastOnly ? '?broadcastOnly=true' : ''}`,
      }),
      providesTags: (result, error, { otherUserId, broadcastOnly }) => [
        { type: 'PrivateMessageThread', id: `${otherUserId}${broadcastOnly ? ':broadcast' : ''}` },
      ],
    }),
    sendMessage: builder.mutation<
      { success: boolean; message: PMMessage },
      { recipientId: string; message: string }
    >({
      query: ({ recipientId, message }) => ({
        url: `/api/private-messages/conversations/${encodeURIComponent(recipientId)}/messages`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (_result, error, { recipientId }) => [
        'PrivateMessageConversations',
        { type: 'PrivateMessageThread', id: recipientId },
      ],
    }),
    markConversationRead: builder.mutation<
      { success: boolean },
      { otherUserId: string; broadcastOnly?: boolean }
    >({
      query: ({ otherUserId, broadcastOnly }) => ({
        url: `/api/private-messages/conversations/${encodeURIComponent(otherUserId)}/read${broadcastOnly ? '?broadcastOnly=true' : ''}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, error, { otherUserId, broadcastOnly }) => [
        'PrivateMessageConversations',
        { type: 'PrivateMessageThread', id: `${otherUserId}${broadcastOnly ? ':broadcast' : ''}` },
      ],
    }),
    blockUser: builder.mutation<{ success: boolean }, string>({
      query: (userId) => ({
        url: `/api/private-messages/block/${encodeURIComponent(userId)}`,
        method: 'POST',
      }),
      invalidatesTags: ['PrivateMessageConversations'],
    }),
    unblockUser: builder.mutation<{ success: boolean }, string>({
      query: (userId) => ({
        url: `/api/private-messages/block/${encodeURIComponent(userId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PrivateMessageConversations'],
    }),
    sendAdminMessageToAll: builder.mutation<{ success: boolean; sentCount: number }, string>({
      query: (message) => ({
        url: '/api/private-messages/admin/send-all',
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: ['PrivateMessageConversations'],
    }),
    deleteConversation: builder.mutation<
      { success: boolean },
      { otherUserId: string; broadcastOnly?: boolean }
    >({
      query: ({ otherUserId, broadcastOnly }) => ({
        url: `/api/private-messages/conversations/${encodeURIComponent(otherUserId)}${broadcastOnly ? '?broadcastOnly=true' : ''}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PrivateMessageConversations'],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetThreadQuery,
  useSendMessageMutation,
  useMarkConversationReadMutation,
  useDeleteConversationMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useSendAdminMessageToAllMutation,
} = privateMessagesApi;
