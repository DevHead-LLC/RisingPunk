import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { updateBalance } from '../slices/balanceSlice';
import { balanceApi } from './balanceApi';
import { botsApi } from './botsApi';

const binaryBankCrackBaseQuery = async (args: any, api: any, extraOptions: any) => {
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

export interface BinaryBankCrackLevelConfig {
  levelId: string;
  tier: number;
  registerCount: number;
  registerSize: number;
  flipLimit: number;
  timeLimitSeconds: number;
  showDecimalAssist: boolean;
  cost: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface BinaryBankCrackStatusResponse {
  levelsCompleted: string[];
  levelConfigs: BinaryBankCrackLevelConfig[];
  tierLevels: string[];
}

export interface BinaryBankCrackSessionResponse {
  vaultTargets: number[];
  flipsRemaining: number;
  currentRegisterIndex: number;
  registerCount: number;
  registerSize: number;
  timeLimitSeconds: number;
  showDecimalAssist?: boolean;
  balance?: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
}

export interface BinaryBankCrackSubmitResponse {
  win: boolean;
  valueMismatch?: boolean;
  /** Per-register: true = correct, false = wrong. */
  registerResults?: boolean[];
  flipsRemaining: number;
  lostAllFlips?: boolean;
  balance?: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
}

export interface BinaryBankCrackClaimResponse {
  success: boolean;
  levelsCompleted: string[];
}

export const binaryBankCrackApi = createApi({
  reducerPath: 'binaryBankCrackApi',
  baseQuery: binaryBankCrackBaseQuery,
  tagTypes: ['BinaryBankCrack'],
  endpoints: (builder) => ({
    getBinaryBankCrackStatus: builder.query<BinaryBankCrackStatusResponse, void>({
      query: () => '/api/binary-bank-crack/status',
      providesTags: ['BinaryBankCrack'],
    }),
    startBinaryBankCrackSession: builder.mutation<BinaryBankCrackSessionResponse, string>({
      query: (levelId) => ({
        url: '/api/binary-bank-crack/session/start',
        method: 'POST',
        body: { levelId },
      }),
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          if (data.balance) {
            dispatch(
              updateBalance({
                total: data.balance.total,
                ratePerSecond: data.balance.ratePerSecond,
                lastUpdated: data.balance.lastUpdated,
              })
            );
            dispatch(balanceApi.util.invalidateTags(['Balance']));
          }
        } catch (_) {}
      },
    }),
    submitBinaryBankCrackRegisters: builder.mutation<
      BinaryBankCrackSubmitResponse,
      { levelId: string; registers: number[][]; flipsUsed?: number }
    >({
      query: ({ levelId, registers, flipsUsed }) => ({
        url: '/api/binary-bank-crack/submit',
        method: 'POST',
        body: { levelId, registers, flipsUsed },
      }),
      invalidatesTags: ['BinaryBankCrack'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          if (data.balance) {
            dispatch(
              updateBalance({
                total: data.balance.total,
                ratePerSecond: data.balance.ratePerSecond,
                lastUpdated: data.balance.lastUpdated,
              })
            );
            dispatch(balanceApi.util.invalidateTags(['Balance']));
          }
        } catch (_) {}
      },
    }),
    claimBinaryBankCrackLevel: builder.mutation<BinaryBankCrackClaimResponse, string>({
      query: (levelId) => ({
        url: '/api/binary-bank-crack/claim',
        method: 'POST',
        body: { levelId },
      }),
      invalidatesTags: ['BinaryBankCrack'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          dispatch(botsApi.endpoints.fetchBotStatsBreakdown.initiate(undefined, { forceRefetch: true }));
        } catch (_) {}
      },
    }),
  }),
});

export const {
  useGetBinaryBankCrackStatusQuery,
  useStartBinaryBankCrackSessionMutation,
  useSubmitBinaryBankCrackRegistersMutation,
  useClaimBinaryBankCrackLevelMutation,
} = binaryBankCrackApi;
