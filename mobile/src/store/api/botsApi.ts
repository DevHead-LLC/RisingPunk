import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { BotType } from '../../types/bots';
import { balanceApi } from './balanceApi';
import { subtractFromBalance, addToBalance } from '../slices/balanceSlice';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { trackFirstBots } from '../../services/analyticsService';

export interface StatRow {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
}

// Custom base query with error handling for botsApi
const botsBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    timeout: 5000,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {headers.set('Authorization', `Bearer ${token}`);}
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    if (handle426IfNeeded(result, api)) return result;
    // Check for account switched error first
    if ((result.error as any)?.status === 401 && (result.error as any)?.data?.error === 'ACCOUNT_SWITCHED') {
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      
      // Clear RTK Query caches to prevent data leakage between users
      resetAllApiCaches(api);
      
      return result; // Return early to prevent other error handling
    } else if ((result.error as any)?.status === 401 && (result.error as any)?.data?.error === 'Token expired') {
      // Dispatch logout action using action type to avoid circular dependency
      api.dispatch({ type: 'auth/logout' });
      return result;
    } else {
      globalErrorHandler.handleDatabaseError(result.error);
    }
  } else {
    globalErrorHandler.markServerReachable();
  }

  return result;
};

export const botsApi = createApi({
  reducerPath: 'botsApi',
  baseQuery: botsBaseQuery,
  tagTypes: ['Bots'],
  endpoints: (builder) => ({
    fetchBots: builder.query<
      { bots: Record<string, number>; battalionAssignments: { botType: BotType; quantity: number }[] },
      void
    >({
      query: () => '/api/bots',
      providesTags: ['Bots'],
    }),
    fetchBuildState: builder.query<{ buildQueue: any; bots: Record<string, number> }, void>({
      query: () => '/api/bots/build-state',
      providesTags: ['Bots'],
    }),
    fetchBotStats: builder.query<{ botStats: any; botStatsM2?: Record<string, unknown> }, void>({
      query: () => '/api/bots/stats',
      providesTags: ['Bots'],
    }),
    fetchBotStatsBreakdown: builder.query<
      {
        userLevel: number;
        breakdown: Record<
          string,
          {
            base: StatRow;
            levelBonus: StatRow;
            programmingBonus: StatRow;
            researchBonus: StatRow;
            total: StatRow;
            mark2?: { base: StatRow; levelBonus: StatRow; total: StatRow };
          }
        >;
      },
      void
    >({
      query: () => '/api/bots/stats-breakdown',
      providesTags: ['Bots'],
    }),
    startBuild: builder.mutation<any, { type: BotType; quantity: number; totalCost: number; markLevel: 1 | 2 }>({
      query: (body) => ({
        url: '/api/bots/build',
        method: 'POST',
        body,
      }),
      async onQueryStarted({ totalCost, type }, { dispatch, queryFulfilled, getState }) {
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
          
          // Track first bots build (only tracks once per user)
          // Analytics tracking is non-blocking - failures shouldn't affect the mutation
          try {
            const state = getState() as any;
            const userId = state?.auth?.user?._id;
            if (userId) {
              trackFirstBots(type, userId).catch((analyticsError) => {
                console.error('[Analytics] Failed to track first bots build:', analyticsError);
              });
            }
          } catch (analyticsError) {
            // Log analytics error but don't fail the mutation
            console.error('[Analytics] Failed to track first bots build:', analyticsError);
          }
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
    assignToBattalion: builder.mutation<
      any,
      { botType: BotType; quantity: number; battalionId: string; markLevel?: 1 | 2 }
    >({
      query: (body) => ({
        url: '/api/bots/assign',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bots'],
    }),
    /** Replaces all battalion assignments in one server request (battle presets). Avoids rate-limit 429 from many /assign calls. */
    assignPresetBattalions: builder.mutation<
      { success: boolean; bots: Record<BotType, number>; battalionAssignments: Array<{ battalionId: string; botType: BotType; quantity: number; markLevel?: number }> },
      { assignments: Array<{ battalionId: string; botType: BotType; quantity: number; markLevel?: number }> }
    >({
      query: (body) => ({
        url: '/api/bots/assign-preset',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Bots'],
    }),
    speedupBotBuild: builder.mutation<
      {
        success: boolean;
        message?: string;
        error?: string;
        newBalance?: number;
        bots?: Record<string, number>;
      },
      void
    >({
      query: () => ({
        url: '/api/bots/speedup-build',
        method: 'POST',
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
      invalidatesTags: ['Bots'],
    }),
  }),
});

export const {
  useFetchBotsQuery,
  useFetchBuildStateQuery,
  useFetchBotStatsQuery,
  useFetchBotStatsBreakdownQuery,
  useStartBuildMutation,
  useAssignToBattalionMutation,
  useAssignPresetBattalionsMutation,
  useSpeedupBotBuildMutation,
} = botsApi;
