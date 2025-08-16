import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { BotType } from '../slices/botsSlice';
import { balanceApi } from './balanceApi';
import { subtractFromBalance, addToBalance } from '../slices/balanceSlice';

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
    fetchBotStats: builder.query<{ botStats: any }, void>({
      query: () => '/api/bots/stats',
      providesTags: ['Bots'],
    }),
    startBuild: builder.mutation<any, { type: BotType; quantity: number; totalCost: number }>({
      query: (body) => ({
        url: '/api/bots/build',
        method: 'POST',
        body,
      }),
      async onQueryStarted({ totalCost }, { dispatch, queryFulfilled, getState }) {
        // Optimistically update the balance immediately
        const patchResult = dispatch(
          balanceApi.util.updateQueryData('fetchBalance', undefined, (draft) => {
            if (draft) {
              draft.total -= totalCost;
            }
          })
        );
        
        // Also update the balance slice state immediately
        const state = getState() as any;
        const currentBalance = state.balance?.total;
        if (currentBalance !== null && currentBalance !== undefined) {
          dispatch(subtractFromBalance(totalCost));
        }

        try {
          await queryFulfilled;
        } catch {
          // If the build fails, revert the optimistic balance update
          patchResult.undo();
          // Also revert the balance slice update
          if (currentBalance !== null && currentBalance !== undefined) {
            dispatch(addToBalance(totalCost));
          }
        }
      },
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

export const { useFetchBotsQuery, useFetchBuildStateQuery, useFetchBotStatsQuery, useStartBuildMutation, useAssignToBattalionMutation } = botsApi;
