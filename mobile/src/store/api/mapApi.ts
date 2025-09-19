import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { MapResponse } from '../../types/map';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';

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
    globalErrorHandler.handleDatabaseError(result.error);
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
