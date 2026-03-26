import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { updateBalance } from '../slices/balanceSlice';
import { balanceApi } from './balanceApi';
import { botsApi } from './botsApi';

const packetBreachBaseQuery = async (args: any, api: any, extraOptions: any) => {
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
    if ((result.error as any).status === 402) {
      // Insufficient funds; let the caller handle (e.g. level screen shows spinner stop, no global modal)
      return result;
    }
    globalErrorHandler.handleDatabaseError(result.error);
  } else {
    globalErrorHandler.markServerReachable();
  }
  return result;
};

export interface PacketBreachLevelConfig {
  levelId: string;
  tier: number;
  slots: number;
  attempts: number;
  cost: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface PacketBreachStatusResponse {
  levelsCompleted: string[];
  levelConfigs: PacketBreachLevelConfig[];
  tierLevels: string[];
}

export interface NodeDef {
  id: string;
  protocol: string;
  port: number;
}

export interface PacketBreachSessionResponse {
  nodePool: NodeDef[];
  slots: number;
  attemptsLeft: number;
  balance?: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
}

export interface PacketBreachSubmitResponse {
  /** Omitted when decoy was used in the sequence (no feedback returned). */
  routed?: number;
  misrouted?: number;
  rejected?: number;
  /** True when the submitted sequence contained the decoy node; no routed/misrouted/rejected in that case. */
  decoyUsed?: boolean;
  attemptsLeft: number;
  lostAllAttempts?: boolean;
  /** True when the submitted sequence matched the hidden anti-solution (trap); lose all attempts. */
  antiSolutionTriggered?: boolean;
  win?: boolean;
  balance?: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
}

export interface PacketBreachClaimResponse {
  success: boolean;
  levelsCompleted: string[];
}

export const packetBreachApi = createApi({
  reducerPath: 'packetBreachApi',
  baseQuery: packetBreachBaseQuery,
  tagTypes: ['PacketBreach'],
  endpoints: (builder) => ({
    getPacketBreachStatus: builder.query<PacketBreachStatusResponse, void>({
      query: () => '/api/packet-breach/status',
      providesTags: ['PacketBreach'],
    }),
    startPacketBreachSession: builder.mutation<PacketBreachSessionResponse, string>({
      query: (levelId) => ({
        url: '/api/packet-breach/session/start',
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
        } catch (_) {
          // Error handled by mutation / global handler
        }
      },
    }),
    submitPacketBreachAttempt: builder.mutation<
      PacketBreachSubmitResponse,
      { levelId: string; sequence: string[] }
    >({
      query: ({ levelId, sequence }) => ({
        url: '/api/packet-breach/submit',
        method: 'POST',
        body: { levelId, sequence },
      }),
      invalidatesTags: ['PacketBreach'],
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
        } catch (_) {
          // Error handled by mutation / global handler
        }
      },
    }),
    claimPacketBreachLevel: builder.mutation<PacketBreachClaimResponse, string>({
      query: (levelId) => ({
        url: '/api/packet-breach/claim',
        method: 'POST',
        body: { levelId },
      }),
      invalidatesTags: ['PacketBreach'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          // Bots/army stats updated by claim; refetch so UI shows new Brute bonus.
          dispatch(botsApi.endpoints.fetchBotStats.initiate(undefined, { forceRefetch: true }));
          dispatch(
            botsApi.endpoints.fetchBotStatsBreakdown.initiate(undefined, { forceRefetch: true })
          );
        } catch (_) {
          // Error handled by mutation
        }
      },
    }),
  }),
});

export const {
  useGetPacketBreachStatusQuery,
  useStartPacketBreachSessionMutation,
  useSubmitPacketBreachAttemptMutation,
  useClaimPacketBreachLevelMutation,
} = packetBreachApi;
