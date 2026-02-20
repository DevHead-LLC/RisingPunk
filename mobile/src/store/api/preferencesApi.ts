import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

export interface UpdatePreferencesRequest {
  profileGender?: 'male' | 'female';
}

export interface UpdatePreferencesResponse {
  success: boolean;
  message: string;
  profileGender: 'male' | 'female';
}

const preferencesBaseQuery = async (args: any, api: any, extraOptions: any) => {
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
  if (handle426IfNeeded(result, api)) return result;
  return result;
};

export const preferencesApi = createApi({
  reducerPath: 'preferencesApi',
  baseQuery: preferencesBaseQuery,
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
