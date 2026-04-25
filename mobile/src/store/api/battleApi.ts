import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type {
  BattleEndData,
  BattleLosses,
  BattalionLoss,
  BattleReplayDocument,
  BattleState,
} from '../../../../shared/battleReplay';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

export type { BattleEndData, BattleLosses, BattalionLoss, BattleReplayDocument, BattleState };

export interface StartBattleRequest {
  userBattalions: Array<{
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    /** Defaults to 1 server-side when omitted. */
    markLevel?: 1 | 2;
  }>;
  screenWidth: number;
  screenHeight: number;
  defenderId?: string;
  defenderNpcSlug?: string;
  unlockHackRigOnWin?: boolean;
  defenderNpcInstanceId?: string;
  /** Hack Map cell when attack started from map (optional; both or neither). */
  hackMapCellX?: number;
  hackMapCellY?: number;
  hunterRosterId?: 'kaito_glitch';
  hunterVisualKey?: 'kaito_glitch_sprint';
}

const battleBaseQuery = async (args: any, api: any, extraOptions: any) => {
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
  if (handle426IfNeeded(result, api)) return result;
  return result;
};

export const battleApi = createApi({
  reducerPath: 'battleApi',
  baseQuery: battleBaseQuery,
  tagTypes: ['Battle', 'BattleReplay'],
  endpoints: (builder) => ({
    startBattle: builder.mutation<{ battleId: string }, StartBattleRequest>({
      query: (body) => ({
        url: '/api/battle/start',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Battle'],
    }),
    getBattleState: builder.query<BattleState, { battleId: string; screenWidth: number; screenHeight: number }>({
      query: ({ battleId, screenWidth, screenHeight }) =>
        `/api/battle/${battleId}/state?screenWidth=${screenWidth}&screenHeight=${screenHeight}`,
      transformResponse: (response: { success: boolean; data: BattleState }) => response.data,
      providesTags: ['Battle'],
    }),
    getBattleReplay: builder.query<BattleReplayDocument, string>({
      query: (battleId) => `/api/battle/${encodeURIComponent(battleId)}/replay`,
      transformResponse: (response: {
        success?: boolean;
        data?: BattleReplayDocument;
        error?: string;
      }) => {
        if (!response?.success || response.data == null) {
          throw new Error(response?.error || 'Failed to load battle replay');
        }
        return response.data;
      },
      providesTags: (_result, _err, battleId) => [{ type: 'BattleReplay', id: battleId }],
    }),
  }),
});

export const { useStartBattleMutation, useGetBattleStateQuery, useGetBattleReplayQuery } = battleApi;
