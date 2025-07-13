import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { Battalion } from '../../types/battle';

// Battle state interface matching server response
export interface BattleState {
  battleId: string;
  phase: 'setup' | 'countdown' | 'battle' | 'victory' | 'defeat';
  timeRemaining: number;
  battalions: Battalion[];
  nodes: Array<{
    index: number;
    owner: 'user' | 'enemy' | 'neutral';
    health?: number;
    captureProgress?: number;
  }>;
  victoryCondition?: {
    winner: 'user' | 'enemy';
    reason: 'elimination' | 'timeout' | 'tie';
  };
}

// Start battle request interface
export interface StartBattleRequest {
  userBattalions: Array<{
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    nodeIndex: number;
  }>;
}

export const battleApi = createApi({
  reducerPath: 'battleApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Battle'],
  endpoints: (builder) => ({
    startBattle: builder.mutation<{ battleId: string }, StartBattleRequest>({
      query: (body) => ({
        url: '/api/battles/start',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Battle'],
    }),
    getBattleState: builder.query<BattleState, string>({
      query: (battleId) => `/api/battles/${battleId}/state`,
      providesTags: ['Battle'],
    }),
  }),
});

export const { useStartBattleMutation, useGetBattleStateQuery } = battleApi; 