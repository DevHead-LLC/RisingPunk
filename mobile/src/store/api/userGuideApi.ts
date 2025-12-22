import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type {
  CurrentTaskResponse,
  CompleteTaskRequest,
  CompleteTaskResponse,
  SkipTaskRequest,
  SkipTaskResponse,
  UpdateVisibilityRequest,
  UpdateVisibilityResponse
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
    }),
  }),
});

export const {
  useGetCurrentTaskGuideTaskQuery,
  useCompleteTaskGuideTaskMutation,
  useSkipTaskGuideTaskMutation,
  useUpdateTaskGuideVisibilityMutation
} = userGuideApi;

