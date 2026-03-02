import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

// Custom base query with error handling for balanceApi
const balanceBaseQuery = async (args: any, api: any, extraOptions: any) => {
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
    if ((result.error as any).status === 401 && (result.error as any).data?.error === 'ACCOUNT_SWITCHED') {
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      
      // Clear RTK Query caches to prevent data leakage between users
      resetAllApiCaches(api);
      
      return result; // Return early to prevent other error handling
    } else if ((result.error as any).status === 401 && (result.error as any).data?.error === 'Token expired') {
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

export interface BalanceResponse {
  total: number;
  ratePerSecond: number;
  lastUpdated: string | Date;
  fractionalRemainder: number;
  lifetimeHighNetWorth?: number;
  lifetimeHighUpdated?: boolean;
  /** Research-based expense reduction per second (for Financial Statements). Server source of truth. */
  insuranceReduction?: number;
  taxReduction?: number;
}

export const balanceApi = createApi({
  reducerPath: 'balanceApi',
  baseQuery: balanceBaseQuery,
  tagTypes: ['Balance'],
  endpoints: (builder) => ({
    fetchBalance: builder.query<BalanceResponse, void>({
      query: () => '/api/balance',
      providesTags: ['Balance'],
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Submit to Game Center only when server confirms lifetime high was updated
          // Server checks database first, so this is the source of truth
          // Throttling in gameCenterService prevents excessive submissions
          if (data.lifetimeHighUpdated && data.lifetimeHighNetWorth !== undefined) {
            const gameCenterService = (await import('../../services/gameCenterService')).default;
            // Don't force - respect throttling since server already checked database
            gameCenterService.submitLifetimeNetWorthScore(data.lifetimeHighNetWorth, false);
          }
        } catch (error) {
          // Silently fail - Game Center submission is optional
        }
      },
    }),
  }),
});

export const { useFetchBalanceQuery } = balanceApi;
