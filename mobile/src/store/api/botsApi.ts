import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { BotType } from '../slices/botsSlice';
import { balanceApi } from './balanceApi';
import { subtractFromBalance, addToBalance } from '../slices/balanceSlice';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';

// Custom base query with error handling for botsApi
const botsBaseQuery = async (args: any, api: any, extraOptions: any) => {
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
    if ((result.error as any)?.status === 401 && (result.error as any)?.data?.error === 'ACCOUNT_SWITCHED') {
      console.log('🔍 BOTS API: ACCOUNT_SWITCHED detected, dispatching action');
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      
      // Clear RTK Query caches to prevent data leakage between users
      resetAllApiCaches(api);
      
      return result; // Return early to prevent other error handling
    } else {
      globalErrorHandler.handleDatabaseError(result.error);
    }
  }

  return result;
};

export const botsApi = createApi({
  reducerPath: 'botsApi',
  baseQuery: botsBaseQuery,
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
        // Get current balance state before any updates
        const state = getState() as any;
        const currentBalance = state.balance?.total;
        
        // Check if we have sufficient funds for optimistic update
        const hasSufficientFunds = currentBalance !== null && currentBalance !== undefined && currentBalance >= totalCost;
        
        // Optimistically update the balance immediately
        const patchResult = dispatch(
          balanceApi.util.updateQueryData('fetchBalance', undefined, (draft) => {
            if (draft && hasSufficientFunds) {
              draft.total -= totalCost;
            }
          })
        );
        
        // Also update the balance slice state immediately (only if sufficient funds)
        if (hasSufficientFunds) {
          dispatch(subtractFromBalance(totalCost));
        }

        try {
          await queryFulfilled;
        } catch {
          // If the build fails, revert the optimistic balance update
          patchResult.undo();
          // Only revert the balance slice update if we actually made the optimistic update
          if (hasSufficientFunds) {
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
