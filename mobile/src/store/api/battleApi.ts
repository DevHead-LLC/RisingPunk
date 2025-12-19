import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { NetworkConnection, LineProperties, MovementState } from '../../types/battleTypes';
import type { RootState } from '../index';

export interface BattalionLoss {
  battalionId: string;
  type: 'guardian' | 'breacher' | 'phreak';
  mark: number;
  startingQuantity: number;
  endingQuantity: number;
  startingPoints: number;
  endingPoints: number;
  losses: number;
  owner: 'user' | 'enemy';
}

export interface BattleLosses {
  userLosses: number;
  enemyLosses: number;
  winner: 'user' | 'enemy';
  userStartingPoints: number;
  userEndingPoints: number;
  enemyStartingPoints: number;
  enemyEndingPoints: number;
  battalionLosses: BattalionLoss[];
  victoryMessage: string;
  endCondition: 'timer' | 'elimination';
  battleDuration: number;
}

export interface BattleEndData {
  battleId: string;
  winner: 'user' | 'enemy';
  losses: BattleLosses;
  endTime: Date;
  phase: 'setup' | 'countdown' | 'battle' | 'victory' | 'defeat' | 'complete';
  experienceGained?: number;
  hackerRewards?: number;
  levelUp?: {
    levelsGained: number;
    newLevel: number;
  };
  isUserDefender?: boolean;
}

export interface BattleState {
  battleId: string;
  phase: 'setup' | 'countdown' | 'battle' | 'victory' | 'defeat' | 'complete';
  timeRemaining: number;
  winner?: 'user' | 'enemy';
  battalions: Array<{
    id: string;
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
    currentHealth: number;
    maxHealth: number;
    position: { x: number; y: number };
    isUser: boolean;
    mark: number;
    stats: {
      health: number;
      speed: number;
      range: number;
      offense: number;
      defense: number;
    };
    movementState?: MovementState;
  }>;
  nodes: Array<{
    index: number;
    owner: 'user' | 'enemy' | 'neutral';
    tugOfWarProgress: number;
    maxCaptureThreshold: number;
    position: { x: number; y: number };
  }>;
  networkConnections: NetworkConnection[];
  lineProperties: LineProperties[];
  movementStates?: MovementState[];
  victoryCondition?: {
    winner: 'user' | 'enemy';
    reason: 'elimination' | 'timeout' | 'tie';
  };
  battleEndData?: BattleEndData;
}

export interface StartBattleRequest {
  userBattalions: Array<{
    type: 'guardian' | 'breacher' | 'phreak';
    quantity: number;
  }>;
  screenWidth: number;
  screenHeight: number;
  defenderId?: string;
  defenderNpcSlug?: string;
  unlockHackRigOnWin?: boolean;
  defenderNpcInstanceId?: string;
}

export const battleApi = createApi({
  reducerPath: 'battleApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth?.token;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      headers.set('Content-Type', 'application/json');
      return headers;
    },
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
