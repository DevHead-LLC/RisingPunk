import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { userGuideApi } from './userGuideApi';
import { bugHuntApi } from './bugHuntApi';

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
  /** Set when user cancels outbound; return animation starts from this hack-map cell toward home. */
  returnLegStartX?: number;
  returnLegStartY?: number;
  /** Set when battle resolution completes and return leg starts (ISO). */
  resolvedAt?: string;
  totalTravelSeconds?: number;
  battleId?: string;
  attackType?: 'solo' | 'swarm' | 'bug_hunt';
  bugInstanceId?: string;
  hunterRosterId?: string;
  hunterVisualKey?: string;
  bugHuntItemDrops?: string[];
  bugHuntHunterXpGranted?: number;
  [key: string]: unknown;
};

export type GetMyAttackMarchesResponse = {
  marches: AttackMarchListItem[];
  asyncMarchesEnabled: boolean;
};

/**
 * RTK polling for GET /api/attack/mine. While `returning`, use a short interval so `done` (row drops),
 * commitment banner, and transition toasts track `returnArriveAt` instead of lagging up to the default 15s.
 */
export function getAttackMarchMinePollingIntervalMs(
  asyncMarchesEnabled: boolean | undefined,
  marches: AttackMarchListItem[] | undefined
): number {
  if (asyncMarchesEnabled === false) {
    return 0;
  }
  if (asyncMarchesEnabled !== true) {
    return 15000;
  }
  const list = marches ?? [];
  if (list.length === 0) {
    return 15000;
  }
  if (list.some((m) => m.state === 'returning')) {
    return 2000;
  }
  return 15000;
}

export type GetActiveAttackMarchesResponse = {
  marches: AttackMarchListItem[];
};

export type LaunchAttackMarchRequest = {
  userBattalions?: Array<{
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
  attackType?: 'solo' | 'swarm' | 'bug_hunt';
  bugInstanceId?: string;
  hunterRosterId?: 'kaito_glitch';
  hunterVisualKey?: 'kaito_glitch_sprint';
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
          dispatch(bugHuntApi.util.invalidateTags(['BugHuntTokens']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    cancelOutboundAttackMarch: builder.mutation<
      CancelAttackMarchResponse,
      { marchId: string; clientNowMs: number; outboundProgressT: number }
    >({
      query: ({ marchId, clientNowMs, outboundProgressT }) => ({
        url: `/api/attack/${encodeURIComponent(marchId)}/cancel`,
        method: 'POST',
        body: { clientNowMs, outboundProgressT },
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
