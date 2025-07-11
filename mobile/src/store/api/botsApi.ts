import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { BotType } from '../slices/botsSlice';

export const botsApi = createApi({
  reducerPath: 'botsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {headers.set('Authorization', `Bearer ${token}`);}
      return headers;
    },
  }),
  tagTypes: ['Bots'],
  endpoints: (builder) => ({
    fetchBots: builder.query<{ bots: Record<BotType, number>; battalionAssignments: { botType: BotType; quantity: number }[] }, void>({
      query: () => '/api/bots',
      providesTags: ['Bots'],
    }),
    fetchBuildState: builder.query<{ buildQueue: any; bots: Record<BotType, number> }, void>({
      query: () => '/api/bots/build-state',
      providesTags: ['Bots'],
    }),
    startBuild: builder.mutation<any, { type: BotType; quantity: number; totalCost: number }>({
      query: (body) => ({
        url: '/api/bots/build',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bots'],
    }),
    assignToBattalion: builder.mutation<any, { botType: BotType; quantity: number; battalionId: string }>({
      query: (body) => ({
        url: '/api/bots/assign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bots'],
    }),
  }),
});

export const { useFetchBotsQuery, useFetchBuildStateQuery, useStartBuildMutation, useAssignToBattalionMutation } = botsApi;
