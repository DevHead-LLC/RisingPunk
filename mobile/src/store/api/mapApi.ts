import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { MapResponse } from '../../types/map';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

// Custom base query with error handling for mapApi
const mapBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {headers.set('Authorization', `Bearer ${token}`);}
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    if (handle426IfNeeded(result, api)) return result;
    const error = result.error as any;
    // Check for request-abort only (expected during fast map panning). Do not match messages that merely contain "abort" (e.g. "Transaction aborted") or we would silently swallow real errors.
    const isAbortError =
      error?.name === 'AbortError' ||
      (error instanceof Error && error.name === 'AbortError') ||
      (typeof error?.message === 'string' && error.message === 'Aborted');
    if (isAbortError) {
      return result;
    }

    // Check for account switched error
    if (error?.status === 401 && error?.data?.error === 'ACCOUNT_SWITCHED') {
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });

      // Clear RTK Query caches to prevent data leakage between users
      resetAllApiCaches(api);

      return result; // Return early to prevent other error handling
    } else if (error?.status === 401 && error?.data?.error === 'Token expired') {
      // Dispatch logout action using action type to avoid circular dependency
      api.dispatch({ type: 'auth/logout' });
      return result;
    }
    // Optional map requests: do not trigger global error modal so user can keep using the app (panning-load.md)
    // - my-position: 404 (no house) or other failures (user-position-and-locator.md)
    // - viewport (x1,y1,x2,y2): timeouts/500s on staging would otherwise show "Something went wrong... Log out"
    const url = typeof args === 'string' ? args : args?.url;
    const path = typeof url === 'string' ? url.split('?')[0] : '';
    const isMyPositionRequest = path.endsWith('/my-position');
    const isViewportRequest = args?.params && typeof args.params === 'object' && 'x1' in args.params && 'x2' in args.params;
    if (!isMyPositionRequest && !isViewportRequest) {
      globalErrorHandler.handleDatabaseError(result.error);
    }
  }

  return result;
};

export const mapApi = createApi({
  reducerPath: 'mapApi',
  baseQuery: mapBaseQuery,
  tagTypes: ['Map', 'MapChat'],
  endpoints: (builder) => ({
    fetchMap: builder.query<MapResponse, void>({
      query: () => '/api/map/main',
      providesTags: ['Map'],
    }),
    fetchMapViewport: builder.query<MapResponse, { x1: number; y1: number; x2: number; y2: number; minimal?: boolean }>({
      query: ({ x1, y1, x2, y2, minimal }) => ({
        url: '/api/map/main',
        params: { x1, y1, x2, y2, minimal: minimal ? 'true' : undefined },
      }),
      providesTags: ['Map'],
    }),
    getMyMapPosition: builder.query<{ x: number; y: number }, void>({
      query: () => ({ url: '/api/map/my-position' }),
      providesTags: ['Map'],
    }),
    updatePlayerPosition: builder.mutation<any, { x: number; y: number }>({
      query: (body) => ({
        url: '/api/map/player-position',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Map'],
    }),
    getMapChatMessages: builder.query<
      { success: boolean; messages: Array<{ id: string; userId: string; username: string; message: string; timestamp: string; isFromAdmin?: boolean }> },
      string
    >({
      query: (mapName) => ({
        url: `/api/map/${encodeURIComponent(mapName)}/chat-messages`,
        method: 'GET',
      }),
      providesTags: (result, error, mapName) => [{ type: 'MapChat', id: mapName }],
      keepUnusedDataFor: 30,
    }),
    sendMapChatMessage: builder.mutation<
      { success: boolean; message: { id: string; userId: string; username: string; message: string; timestamp: string; isFromAdmin?: boolean } },
      { mapName: string; message: string }
    >({
      query: ({ mapName, message }) => ({
        url: `/api/map/${encodeURIComponent(mapName)}/chat-messages`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (result, error, { mapName }) => [{ type: 'MapChat', id: mapName }],
    }),
  }),
});

export const {
  useFetchMapQuery,
  useFetchMapViewportQuery,
  useGetMyMapPositionQuery,
  useLazyGetMyMapPositionQuery,
  useUpdatePlayerPositionMutation,
  useGetMapChatMessagesQuery,
  useSendMapChatMessageMutation,
} = mapApi;
