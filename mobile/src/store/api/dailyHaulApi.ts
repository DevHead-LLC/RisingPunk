import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { balanceApi } from './balanceApi';
import { updateBalance } from '../slices/balanceSlice';

const dailyHaulBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    timeout: 5000,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    if (handle426IfNeeded(result, api)) return result;
    if ((result.error as any).status === 401 && (result.error as any).data?.error === 'ACCOUNT_SWITCHED') {
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      resetAllApiCaches(api);
      return result;
    }
    if ((result.error as any).status === 401 && (result.error as any).data?.error === 'Token expired') {
      api.dispatch({ type: 'auth/logout' });
      return result;
    }
    globalErrorHandler.handleDatabaseError(result.error);
  } else {
    globalErrorHandler.markServerReachable();
  }
  return result;
};

export interface DailyHaulStatusResponse {
  resetsAt: string;
  nextClaimDay: number | null;
  canClaim: boolean;
  rewardLabel: string;
  rewardMin?: number;
  rewardMax?: number;
  rewardFlat?: number;
  claimedDays: number[];
  awardedAmounts: number[];
  markedOffDays: number[];
}

export interface DailyHaulClaimResponse {
  awardedAmount: number;
  day: number;
  resetsAt: string;
  balance: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
}

export const dailyHaulApi = createApi({
  reducerPath: 'dailyHaulApi',
  baseQuery: dailyHaulBaseQuery,
  tagTypes: ['DailyHaul', 'Balance'],
  endpoints: (builder) => ({
    getDailyHaulStatus: builder.query<DailyHaulStatusResponse, void>({
      query: () => '/api/daily-haul/status',
      providesTags: ['DailyHaul'],
    }),
    claimDailyHaul: builder.mutation<DailyHaulClaimResponse, void>({
      query: () => ({ url: '/api/daily-haul/claim', method: 'POST' }),
      invalidatesTags: ['DailyHaul'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            updateBalance({
              total: data.balance.total,
              ratePerSecond: data.balance.ratePerSecond,
              lastUpdated: data.balance.lastUpdated,
            })
          );
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        } catch (_) {
          // Error handled by mutation
        }
      },
    }),
  }),
});

export const { useGetDailyHaulStatusQuery, useClaimDailyHaulMutation } = dailyHaulApi;
