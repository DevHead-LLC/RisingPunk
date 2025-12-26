import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
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
  TrackAvatarChangeResponse
} from '../../types/userGuide';

export const userGuideApi = createApi({
  reducerPath: 'userGuideApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
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
  }),
});

export const {
  useGetCurrentTaskGuideTaskQuery,
  useCompleteTaskGuideTaskMutation,
  useSkipTaskGuideTaskMutation,
  useUpdateTaskGuideVisibilityMutation,
  useTrackProfileVisitMutation,
  useTrackThemeChangeMutation,
  useTrackAvatarChangeMutation
} = userGuideApi;

