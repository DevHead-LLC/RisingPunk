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

const EMPTY_STAT_ROW: StatRow = {
  health: 0,
  offense: 0,
  defense: 0,
  speed: 0,
  range: 0,
};

function coerceStatRow(input: unknown): StatRow {
  if (!input || typeof input !== 'object') {
    return { ...EMPTY_STAT_ROW };
  }
  const r = input as Record<string, unknown>;
  const n = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return {
    health: n(r.health),
    offense: n(r.offense),
    defense: n(r.defense),
    speed: n(r.speed),
    range: n(r.range),
  };
}

export type BotStatsBreakdownPayload = {
  userLevel: number;
  breakdown: Record<
    string,
    {
      base: StatRow;
      levelBonus: StatRow;
      programmingBonus: StatRow;
      crewResearchBonus: StatRow;
      crewLevelBonus: StatRow;
      total: StatRow;
      mark2: { base: StatRow; levelBonus: StatRow; total: StatRow };
    }
  >;
};

/**
 * Normalize stats-breakdown entries so `crewResearchBonus` / `crewLevelBonus` are always StatRows:
 * missing keys, snake_case, null, or non-object values would otherwise make Profile/Digital Barracks misbehave.
 */
function normalizeBotStatsBreakdownResponse(data: unknown): BotStatsBreakdownPayload {
  if (!data || typeof data !== 'object') {
    return { userLevel: 0, breakdown: {} };
  }
  const d = data as Record<string, unknown>;
  const raw = d.breakdown;
  if (!raw || typeof raw !== 'object') {
    return {
      userLevel: typeof d.userLevel === 'number' ? d.userLevel : 0,
      breakdown: {},
    };
  }
  const breakdown: BotStatsBreakdownPayload['breakdown'] = {};
  for (const key of Object.keys(raw)) {
    const b = (raw as Record<string, unknown>)[key];
    if (!b || typeof b !== 'object') continue;
    const entry = { ...(b as Record<string, unknown>) };
    const crRaw =
      entry.crewResearchBonus ??
      entry.crew_research_bonus;
    const clRaw =
      entry.crewLevelBonus ??
      entry.crew_level_bonus;
    entry.crewResearchBonus = coerceStatRow(crRaw);
    entry.crewLevelBonus = coerceStatRow(clRaw);
    breakdown[key] = entry as BotStatsBreakdownPayload['breakdown'][string];
  }
  return {
    userLevel: typeof d.userLevel === 'number' ? d.userLevel : 0,
    breakdown,
  };
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
    fetchBotStatsBreakdown: builder.query<BotStatsBreakdownPayload, void>({
      query: () => '/api/bots/stats-breakdown',
      transformResponse: (response: unknown) => normalizeBotStatsBreakdownResponse(response),
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
