import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

export type BugInstanceDto = {
  bugInstanceId: string;
  bugType: 'ant';
  mapCellX: number;
  mapCellY: number;
  maxHp: number;
  currentHp: number;
  hpPercent: number;
  seq: number;
  lifecycleState: 'alive' | 'defeated' | 'removed';
  spawnedAt: string;
  defeatedAt?: string;
  removedAt?: string;
};

export type UserHunterDto = {
  userId: string;
  hunterRosterId: 'kaito_glitch';
  unlockedAt: string;
  level: number;
  currentExp: number;
  nextLevelExp: number;
  totalExp: number;
};

export type HunterStatLine = {
  health: number;
  offense: number;
  defense: number;
  speed: number;
  range: number;
};

export type BugHuntWorldStateDto = {
  reseedInProgress: boolean;
  nextAntWorldReseedAtUtc: string;
  serverTimeMs: number;
  updatedAtUtc: string;
};

export type BugHuntTokenStateDto = {
  currentTokens: number;
  maxTokens: number;
  regenPerMinute: number;
  lastRegenAt: string;
  serverTimeMs: number;
};

export type BugHuntStorageInventoryItemDto = {
  itemKey: string;
  label: string;
  category: 'cash' | 'speedup' | 'travel';
  quantity: number;
  cashAmount?: number;
  durationSeconds?: number;
  speedupDomain?: 'research' | 'construction' | 'bot_assembly';
  travelSpeedPercent?: number;
};

export type BugHuntConstructionSpeedupTarget =
  | 'research-center'
  | 'remodel'
  | 'property-build-1'
  | 'property-build-2'
  | 'property-build-3'
  | 'property-build-4';

const bugHuntBaseQuery = async (args: any, api: any, extraOptions: any) => {
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

export const bugHuntApi = createApi({
  reducerPath: 'bugHuntApi',
  baseQuery: bugHuntBaseQuery,
  tagTypes: ['BugInstances', 'BugWorldState', 'UserHunters', 'BugHuntTokens'],
  endpoints: (builder) => ({
    fetchBugInstances: builder.query<
      { bugs: BugInstanceDto[]; antWorldCap: number; serverNowUtc: string },
      { bugType?: 'ant'; lifecycleState?: 'alive' | 'defeated' | 'removed' }
    >({
      query: ({ bugType, lifecycleState }) => ({
        url: '/api/bug-hunt/bugs',
        params: {
          bugType,
          lifecycleState,
        },
      }),
      providesTags: ['BugInstances'],
    }),
    fetchBugViewport: builder.query<
      { bugs: BugInstanceDto[]; viewport: { x1: number; y1: number; x2: number; y2: number }; serverTimeMs: number },
      { x1: number; y1: number; x2: number; y2: number }
    >({
      query: ({ x1, y1, x2, y2 }) => ({
        url: '/api/bug-hunt/bugs/viewport',
        params: { x1, y1, x2, y2 },
      }),
      providesTags: ['BugInstances'],
    }),
    fetchBugById: builder.query<{ bug: BugInstanceDto; serverTimeMs: number }, string>({
      query: (bugInstanceId) => ({
        url: `/api/bug-hunt/bugs/${encodeURIComponent(bugInstanceId)}`,
      }),
      providesTags: ['BugInstances'],
    }),
    fetchBugWorldState: builder.query<BugHuntWorldStateDto, void>({
      query: () => '/api/bug-hunt/world-state',
      providesTags: ['BugWorldState'],
    }),
    fetchBugHuntTokenState: builder.query<BugHuntTokenStateDto, void>({
      query: () => '/api/bug-hunt/tokens',
      providesTags: ['BugHuntTokens'],
    }),
    fetchMyHunters: builder.query<{ hunters: UserHunterDto[]; maxHunterLevel: number }, void>({
      query: () => '/api/bug-hunt/hunters/me',
      providesTags: ['UserHunters'],
    }),
    unlockHunter: builder.mutation<{ hunter: UserHunterDto }, { hunterRosterId: 'kaito_glitch' }>({
      query: (body) => ({
        url: '/api/bug-hunt/hunters/unlock',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserHunters'],
    }),
    fetchHunterStats: builder.query<
      {
        hunter: {
          hunterRosterId: 'kaito_glitch';
          level: number;
          currentExp: number;
          nextLevelExp: number;
          totalExp: number;
        };
        stats: { current: HunterStatLine; next: HunterStatLine | null };
      },
      'kaito_glitch'
    >({
      query: (hunterRosterId) => `/api/bug-hunt/hunters/${encodeURIComponent(hunterRosterId)}/stats`,
      providesTags: ['UserHunters'],
    }),
    fetchStorageInventory: builder.query<
      { items: BugHuntStorageInventoryItemDto[]; pendingTravelSpeedupPercent?: number | null; serverTimeMs: number },
      void
    >({
      query: () => '/api/bug-hunt/storage/inventory',
      providesTags: ['UserHunters'],
    }),
    useStorageItem: builder.mutation<
      {
        success: true;
        effect: 'cash' | 'speedup' | 'travel';
        itemKey: string;
        quantityUsed?: number;
        cashAdded?: number;
        domain?: 'research' | 'construction' | 'bot_assembly';
        target?: string;
        nextCompletesAt?: string;
        nextArriveAt?: string;
        nextReturnArriveAt?: string;
        phase?: 'outbound' | 'returning';
        attackMarchId?: string;
        probeId?: string;
        probeRemainingMs?: number;
        probeReturnEndAt?: string;
        travelSpeedPercentApplied?: number;
        pendingTravelSpeedupPercent?: number;
        serverTimeMs: number;
      },
      {
        itemKey: string;
        speedupTarget?: BugHuntConstructionSpeedupTarget;
        researchCategoryId?: string;
        researchFeatureId?: string;
        attackMarchId?: string;
        probeId?: string;
        quantity?: number;
      }
    >({
      query: (body) => ({
        url: '/api/bug-hunt/storage/use',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserHunters'],
    }),
  }),
});

export const {
  useFetchBugInstancesQuery,
  useFetchBugViewportQuery,
  useFetchBugByIdQuery,
  useFetchBugWorldStateQuery,
  useFetchBugHuntTokenStateQuery,
  useFetchMyHuntersQuery,
  useUnlockHunterMutation,
  useFetchHunterStatsQuery,
  useFetchStorageInventoryQuery,
  useUseStorageItemMutation,
} = bugHuntApi;
