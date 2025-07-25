import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
// Battalion interface defined inline to match server response format

// Network connection interface (server authority - imported from types)
import { NetworkConnection } from '../../types/battleTypes';

// Line properties interface (server authority - imported from types)
import { LineProperties, MovementState } from '../../types/battleTypes';

// Battle state interface matching server response
export interface BattleState {
  battleId: string;
  phase: 'setup' | 'countdown' | 'battle' | 'victory' | 'defeat';
  timeRemaining: number;
  battalions: Array<{
    id: string;
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    currentHealth: number;
    maxHealth: number;
    nodeIndex: number;
    isUser: boolean;
    mark: number;
    stats: {
      health: number;
      speed: number;
      range: number;
      offense: number;
      defense: number;
    };
    movementState?: MovementState; // Individual battalion movement state
  }>; // Server-provided battalion data (read-only)
  nodes: Array<{
    index: number;
    owner: 'user' | 'enemy' | 'neutral';
    tugOfWarProgress: number;      // NEW: -100 to +100
    maxCaptureThreshold: number;   // NEW: Total army health
    position: { x: number; y: number }; // Server-provided node positions
  }>; // Server-provided node data (read-only)
  networkConnections: NetworkConnection[]; // Server-provided network topology
  lineProperties: LineProperties[];       // Server-calculated line properties
  movementStates?: MovementState[];      // Global movement states array
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
  screenWidth: number;
  screenHeight: number;
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
      transformResponse: (response: { success: boolean; data: BattleState }) => {
        // Debug: Log what's being received from server (reduced logging)
        // console.log(`📡 API DEBUG: Response received - movementStates: ${response.data.movementStates?.length || 0}`);
        return response.data;
      },
      providesTags: ['Battle'],
    }),
  }),
});

export const { useStartBattleMutation, useGetBattleStateQuery } = battleApi;
