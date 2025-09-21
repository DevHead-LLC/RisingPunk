import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { MapResponse } from '../../types/map';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { authApi } from './authApi';
import { balanceApi } from './balanceApi';
import { botsApi } from './botsApi';

// Custom base query with error handling for mapApi
const mapBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {headers.set('Authorization', `Bearer ${token}`);}
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    // Check for account switched error first
    if (result.error?.status === 401 && result.error?.data?.error === 'ACCOUNT_SWITCHED') {
      console.log('🔍 MAP API: ACCOUNT_SWITCHED detected, dispatching action');
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      
      // Clear RTK Query caches to prevent data leakage between users
      console.log('🔍 MAP API: Clearing RTK Query caches to prevent data leakage');
      api.dispatch(authApi.util.resetApiState());
      api.dispatch(balanceApi.util.resetApiState());
      api.dispatch(botsApi.util.resetApiState());
      api.dispatch(mapApi.util.resetApiState());
      
      return result; // Return early to prevent other error handling
    } else {
      globalErrorHandler.handleDatabaseError(result.error);
    }
  }

  return result;
};

export const mapApi = createApi({
  reducerPath: 'mapApi',
  baseQuery: mapBaseQuery,
  tagTypes: ['Map'],
  endpoints: (builder) => ({
    fetchMap: builder.query<MapResponse, void>({
      query: () => '/api/map/main',
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
  }),
});

export const { useFetchMapQuery, useUpdatePlayerPositionMutation } = mapApi;
