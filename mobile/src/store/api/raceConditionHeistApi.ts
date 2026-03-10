import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { updateBalance } from '../slices/balanceSlice';
import { balanceApi } from './balanceApi';
import { botsApi } from './botsApi';

const raceConditionHeistBaseQuery = async (args: any, api: any, extraOptions: any) => {
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

export interface RaceConditionHeistLevelConfig {
  levelId: string;
  tier: number;
  matchDurationMs: number;
  cost: number;
  scoreThreshold: number;
  isCompleted: boolean;
  isUnlocked: boolean;
}

export interface RaceConditionHeistStatusResponse {
  levelsCompleted: string[];
  levelConfigs: RaceConditionHeistLevelConfig[];
  tierLevels: string[];
}

export interface RCHPacket {
  id: string;
  type: string;
  value: number;
  isHijacked: boolean;
}

export interface RaceConditionHeistSessionResponse {
  startedAt: string;
  /** Server time when response was built; client uses this to sync word timing with server. */
  serverTime?: string;
  matchDurationMs: number;
  /** Score required to pass this level (e.g. 50 tier 1, 100 tier 2). From server so client uses correct threshold. */
  scoreThreshold?: number;
  wordRotation: string[];
  wordDurationMs: number;
  /** Random starting index in wordRotation so cycle doesn't always start at 0. */
  wordStartOffset?: number;
  /** Tier 2: second word cycle for second node (Encrypt); starts when first node is captured. */
  wordRotationPhase2?: string[];
  wordStartOffsetPhase2?: number;
  /** Set when first packet is hijacked; used for phase-2 word display. */
  phase2StartedAt?: string;
  /** Tier 3: third word cycle and start time for third node (Exfiltrate). */
  wordRotationPhase3?: string[];
  wordStartOffsetPhase3?: number;
  phase3StartedAt?: string;
  /** Tier 4: fourth word cycle and start time for fourth node (Bypass). */
  wordRotationPhase4?: string[];
  wordStartOffsetPhase4?: number;
  phase4StartedAt?: string;
  phase: 'RUNNING' | 'LOCKDOWN' | 'RESULTS';
  packets: RCHPacket[];
  score: number;
  comboCount: number;
  exploitCooldownUntil?: string;
  balance?: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
}

/** Client viewpoint at tap (onPressIn) for server comparison; see taskItems/problemSolvingTempFile.md */
export interface RaceConditionHeistClientViewpoint {
  clientTimestampMs: number;
  displayedWordIndex: number;
  displayedWordLabel: string;
  clientPhaseElapsedMs: number;
  wordDurationMs: number;
  wordCount: number;
}

export interface RaceConditionHeistAttemptHijackRequest {
  levelId: string;
  packetId: string;
  displayedWordIndex?: number;
  clientViewpoint?: RaceConditionHeistClientViewpoint;
}

export interface RaceConditionHeistAttemptResponse {
  success: boolean;
  reason?: 'cooldown' | 'missed_window' | 'match_ended' | 'complete_first_node' | 'complete_previous_nodes' | 'fatal_secure_word';
  addedScore?: number;
  packets: RCHPacket[];
  score: number;
  comboCount: number;
  exploitCooldownUntil?: string;
  /** Set when first node is captured (tier 2+); client uses this to start phase-2 word display. */
  phase2StartedAt?: string;
  wordRotationPhase2?: string[];
  wordStartOffsetPhase2?: number;
  /** Set when second node is captured (tier 3); client uses this to start phase-3 word display. */
  phase3StartedAt?: string;
  wordRotationPhase3?: string[];
  wordStartOffsetPhase3?: number;
  /** Set when third node is captured (tier 4); client uses this to start phase-4 word display. */
  phase4StartedAt?: string;
  wordRotationPhase4?: string[];
  wordStartOffsetPhase4?: number;
  /** Server time when response was built; client uses this to keep word timing in sync. */
  serverTime?: string;
}

export interface RaceConditionHeistEndRunResponse {
  phase: string;
  packets: RCHPacket[];
  score: number;
  comboCount: number;
  scoreThreshold: number;
  won: boolean;
}

export interface RaceConditionHeistClaimResponse {
  success: boolean;
  levelsCompleted: string[];
}

export const raceConditionHeistApi = createApi({
  reducerPath: 'raceConditionHeistApi',
  baseQuery: raceConditionHeistBaseQuery,
  tagTypes: ['RaceConditionHeist'],
  endpoints: (builder) => ({
    getRaceConditionHeistStatus: builder.query<RaceConditionHeistStatusResponse, void>({
      query: () => '/api/race-condition-heist/status',
      providesTags: ['RaceConditionHeist'],
    }),
    startRaceConditionHeistSession: builder.mutation<RaceConditionHeistSessionResponse, string>({
      query: (levelId) => ({
        url: '/api/race-condition-heist/session/start',
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
    attemptRaceConditionHeistHijack: builder.mutation<
      RaceConditionHeistAttemptResponse,
      RaceConditionHeistAttemptHijackRequest
    >({
      query: ({ levelId, packetId, displayedWordIndex, clientViewpoint }) => ({
        url: '/api/race-condition-heist/attempt-hijack',
        method: 'POST',
        body: {
          levelId,
          packetId,
          ...(typeof displayedWordIndex === 'number' && { displayedWordIndex }),
          ...(clientViewpoint && { clientViewpoint }),
        },
      }),
    }),
    endRaceConditionHeistRun: builder.mutation<RaceConditionHeistEndRunResponse, string>({
      query: (levelId) => ({
        url: '/api/race-condition-heist/end-run',
        method: 'POST',
        body: { levelId },
      }),
    }),
    claimRaceConditionHeistLevel: builder.mutation<RaceConditionHeistClaimResponse, string>({
      query: (levelId) => ({
        url: '/api/race-condition-heist/claim',
        method: 'POST',
        body: { levelId },
      }),
      invalidatesTags: ['RaceConditionHeist'],
      async onQueryStarted(_, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
          dispatch(
            botsApi.endpoints.fetchBotStatsBreakdown.initiate(undefined, { forceRefetch: true })
          );
        } catch (_) {}
      },
    }),
  }),
});

export const {
  useGetRaceConditionHeistStatusQuery,
  useStartRaceConditionHeistSessionMutation,
  useAttemptRaceConditionHeistHijackMutation,
  useEndRaceConditionHeistRunMutation,
  useClaimRaceConditionHeistLevelMutation,
} = raceConditionHeistApi;
