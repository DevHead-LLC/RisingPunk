import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { balanceApi } from './balanceApi';
import type {
  CurrentTaskResponse,
  CompleteTaskRequest,
  CompleteTaskResponse,
  SkipTaskRequest,
  SkipTaskResponse,
  UpdateVisibilityRequest,
  UpdateVisibilityResponse,
  TrackProfileVisitResponse,
  TrackThemeChangeRequest,
  TrackThemeChangeResponse,
  TrackAvatarChangeResponse,
  TrackHomeVisitResponse,
  TrackHackmapVisitResponse,
  TrackDigitalBarracksVisitResponse,
  TrackWalletViewResponse,
  TrackFinancialStatementViewResponse,
  TrackUsernameChangeSettingViewResponse,
  TrackAnotherUserProfileVisitRequest,
  TrackAnotherUserProfileVisitResponse,
  TrackTaskGuidePillTapResponse
} from '../../types/userGuide';

const userGuideBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);
  if (result.error && handle426IfNeeded(result, api)) {}
  return result;
};

export const userGuideApi = createApi({
  reducerPath: 'userGuideApi',
  baseQuery: userGuideBaseQuery,
  tagTypes: ['UserTaskProgress'],
  endpoints: (builder) => ({
    getCurrentTaskGuideTask: builder.query<CurrentTaskResponse, void>({
      query: () => '/api/users/user-guide/current-task',
      providesTags: ['UserTaskProgress'],
    }),
    completeTaskGuideTask: builder.mutation<CompleteTaskResponse, CompleteTaskRequest>({
      query: (body) => ({
        url: '/api/users/user-guide/complete-task',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate Balance tag from balanceApi to ensure fresh balance data
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
      invalidatesTags: ['UserTaskProgress'],
    }),
    skipTaskGuideTask: builder.mutation<SkipTaskResponse, SkipTaskRequest>({
      query: (body) => ({
        url: '/api/users/user-guide/skip-task',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserTaskProgress'],
    }),
    updateTaskGuideVisibility: builder.mutation<UpdateVisibilityResponse, UpdateVisibilityRequest>({
      query: (body) => ({
        url: '/api/users/user-guide/visibility',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI immediately
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackProfileVisit: builder.mutation<TrackProfileVisitResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-profile-visit',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackThemeChange: builder.mutation<TrackThemeChangeResponse, TrackThemeChangeRequest>({
      query: (body) => ({
        url: '/api/users/user-guide/track-theme-change',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackAvatarChange: builder.mutation<TrackAvatarChangeResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-avatar-change',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackHomeVisit: builder.mutation<TrackHomeVisitResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-home-visit',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackHackmapVisit: builder.mutation<TrackHackmapVisitResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-hackmap-visit',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackDigitalBarracksVisit: builder.mutation<TrackDigitalBarracksVisitResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-digital-barracks-visit',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackWalletView: builder.mutation<TrackWalletViewResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-wallet-view',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackFinancialStatementView: builder.mutation<TrackFinancialStatementViewResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-financial-statement-view',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackUsernameChangeSettingView: builder.mutation<TrackUsernameChangeSettingViewResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-username-change-setting-view',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackAnotherUserProfileVisit: builder.mutation<TrackAnotherUserProfileVisitResponse, TrackAnotherUserProfileVisitRequest>({
      query: (body) => ({
        url: '/api/users/user-guide/track-another-user-profile-visit',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserTaskProgress'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate to refetch current task and update UI
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    trackTaskGuidePillTap: builder.mutation<TrackTaskGuidePillTapResponse, void>({
      query: () => ({
        url: '/api/users/user-guide/track-task-guide-pill-tap',
        method: 'POST',
      }),
      invalidatesTags: ['UserTaskProgress'],
    }),
  }),
});

export const {
  useGetCurrentTaskGuideTaskQuery,
  useCompleteTaskGuideTaskMutation,
  useSkipTaskGuideTaskMutation,
  useUpdateTaskGuideVisibilityMutation,
  useTrackProfileVisitMutation,
  useTrackThemeChangeMutation,
  useTrackAvatarChangeMutation,
  useTrackHomeVisitMutation,
  useTrackHackmapVisitMutation,
  useTrackDigitalBarracksVisitMutation,
  useTrackWalletViewMutation,
  useTrackFinancialStatementViewMutation,
  useTrackUsernameChangeSettingViewMutation,
  useTrackAnotherUserProfileVisitMutation,
  useTrackTaskGuidePillTapMutation
} = userGuideApi;

