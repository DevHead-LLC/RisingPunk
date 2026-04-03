import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

/** Lean march row (no `armySnapshot`) from GET /api/attack/mine or /active. */
export type AttackMarchListItem = {
  marchId: string;
  attackerId: string;
  defenderId: string;
  state: string;
  departAt: string;
  arriveAt: string;
  defenderQueueKey?: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  hackMapCellX: number;
  hackMapCellY: number;
  returnArriveAt?: string;
  /** Set when battle resolution completes and return leg starts (ISO). */
  resolvedAt?: string;
  totalTravelSeconds?: number;
  battleId?: string;
  [key: string]: unknown;
};

export type GetMyAttackMarchesResponse = {
  marches: AttackMarchListItem[];
  asyncMarchesEnabled: boolean;
};

export type GetActiveAttackMarchesResponse = {
  marches: AttackMarchListItem[];
};

export type LaunchAttackMarchRequest = {
  userBattalions: Array<{
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    markLevel?: 1 | 2;
  }>;
  screenWidth: number;
  screenHeight: number;
  originX: number;
  originY: number;
  hackMapCellX: number;
  hackMapCellY: number;
  defenderId?: string;
  defenderNpcSlug?: string;
  defenderNpcInstanceId?: string;
};

export type LaunchAttackMarchResponse = {
  success: boolean;
  data?: {
    marchId: string;
    departAt: string;
    arriveAt: string;
    distanceDu: number;
    secondsPerDu: number;
    totalTravelSeconds: number;
  };
  error?: string;
};

export type CancelAttackMarchResponse = {
  success: boolean;
  error?: string;
};

const attackBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);
  if (handle426IfNeeded(result as Parameters<typeof handle426IfNeeded>[0], api)) return result;
  return result;
};

export const attackApi = createApi({
  reducerPath: 'attackApi',
  baseQuery: attackBaseQuery,
  tagTypes: ['AttackMarch', 'Bots'],
  endpoints: (builder) => ({
    getMyAttackMarches: builder.query<GetMyAttackMarchesResponse, void>({
      query: () => '/api/attack/mine',
      providesTags: ['AttackMarch'],
    }),
    getActiveAttackMarches: builder.query<GetActiveAttackMarchesResponse, void>({
      query: () => '/api/attack/active',
      providesTags: ['AttackMarch'],
    }),
    launchAttackMarch: builder.mutation<LaunchAttackMarchResponse, LaunchAttackMarchRequest>({
      query: (body) => ({
        url: '/api/attack/launch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AttackMarch', 'Bots'],
    }),
    cancelOutboundAttackMarch: builder.mutation<CancelAttackMarchResponse, { marchId: string }>({
      query: ({ marchId }) => ({
        url: `/api/attack/${encodeURIComponent(marchId)}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['AttackMarch', 'Bots'],
    }),
  }),
});

export const {
  useGetMyAttackMarchesQuery,
  useGetActiveAttackMarchesQuery,
  useLaunchAttackMarchMutation,
  useCancelOutboundAttackMarchMutation,
} = attackApi;
