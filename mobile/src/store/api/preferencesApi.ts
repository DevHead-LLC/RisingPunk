import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';

export interface UpdatePreferencesRequest {
  profileGender?: 'male' | 'female';
}

export interface UpdatePreferencesResponse {
  success: boolean;
  message: string;
  profileGender: 'male' | 'female';
}

export const preferencesApi = createApi({
  reducerPath: 'preferencesApi',
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
  endpoints: (builder) => ({
    updatePreferences: builder.mutation<UpdatePreferencesResponse, UpdatePreferencesRequest>({
      query: (preferences) => ({
        url: '/api/users/preferences',
        method: 'PUT',
        body: preferences,
      }),
    }),
  }),
});

export const { useUpdatePreferencesMutation } = preferencesApi;
