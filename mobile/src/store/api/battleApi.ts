import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { Battalion } from '../../types/battle';

// Network connection interface matching server format
export interface NetworkConnection {
  from: number;
  to: number;
}

// Line properties interface matching server format
export interface LineProperties {
  length: number;
  angle: number;
  left: number;
  top: number;
}

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
    position: { x: number; y: number }; // Server-provided node positions
  }>;
  networkConnections: NetworkConnection[]; // Server-provided network topology
  lineProperties: LineProperties[];       // Server-calculated line properties
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
    // Authentication temporarily removed for battle testing
  }),
  tagTypes: ['Battle'],
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
  }),
});

export const { useStartBattleMutation, useGetBattleStateQuery } = battleApi;
