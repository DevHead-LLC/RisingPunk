import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { MapResponse } from '../../types/map';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';

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
    const error = result.error as any;
    
    // Check for abort errors first - these are expected during fast map panning
    const isAbortError = error?.name === 'AbortError' || 
                         (error instanceof Error && error.name === 'AbortError');
    
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
    fetchMapViewport: builder.query<MapResponse, { x1: number; y1: number; x2: number; y2: number; minimal?: boolean }>({
      query: ({ x1, y1, x2, y2, minimal }) => ({
        url: '/api/map/main',
        params: { x1, y1, x2, y2, minimal: minimal ? 'true' : undefined },
      }),
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

export const { useFetchMapQuery, useFetchMapViewportQuery, useUpdatePlayerPositionMutation } = mapApi;
