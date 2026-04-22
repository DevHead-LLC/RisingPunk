import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { attackApi } from './attackApi';

export type SwarmCommitment = {
  slotIndex: number;
  userId: string;
  userHandle?: string;
  botType: 'guardian' | 'breacher' | 'phreak';
  markLevel: 1 | 2;
  quantity: number;
  committedAt: string;
};

export type SwarmSession = {
  swarmId: string;
  leaderUserId: string;
  crewId: string;
  targetUserId: string;
  targetX: number;
  targetY: number;
  state: 'preparing' | 'marching' | 'resolved' | 'cancelled';
  deadlineAt: string;
  deployedAt?: string;
  resolvedAt?: string;
  marchId?: string;
  battleId?: string;
  commitments: SwarmCommitment[];
  participants: string[];
};

const swarmBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: `${API_URL}/api/swarm`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
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

export const swarmApi = createApi({
  reducerPath: 'swarmApi',
  baseQuery: swarmBaseQuery,
  tagTypes: ['Swarm'],
  endpoints: (builder) => ({
    getMySwarm: builder.query<SwarmSession | null, void>({
      query: () => '/mine',
      transformResponse: (resp: { success: boolean; data: SwarmSession | null }) => resp.data ?? null,
      providesTags: ['Swarm'],
    }),
    createSwarm: builder.mutation<
      SwarmSession,
      { targetUserId: string; targetX: number; targetY: number }
    >({
      query: (body) => ({ url: '/create', method: 'POST', body }),
      transformResponse: (resp: { success: boolean; data: SwarmSession }) => resp.data,
      invalidatesTags: ['Swarm'],
    }),
    commitSwarmSlot: builder.mutation<
      SwarmSession,
      {
        swarmId: string;
        slotIndex: number;
        botType: 'guardian' | 'breacher' | 'phreak';
        quantity: number;
        markLevel: 1 | 2;
      }
    >({
      query: ({ swarmId, ...body }) => ({
        url: `/${encodeURIComponent(swarmId)}/commit`,
        method: 'POST',
        body,
      }),
      transformResponse: (resp: { success: boolean; data: SwarmSession }) => resp.data,
      invalidatesTags: ['Swarm'],
    }),
    dismissSwarmSlot: builder.mutation<SwarmSession, { swarmId: string; slotIndex: number }>({
      query: ({ swarmId, slotIndex }) => ({
        url: `/${encodeURIComponent(swarmId)}/dismiss`,
        method: 'POST',
        body: { slotIndex },
      }),
      transformResponse: (resp: { success: boolean; data: SwarmSession }) => resp.data,
      invalidatesTags: ['Swarm'],
    }),
    deploySwarm: builder.mutation<SwarmSession, { swarmId: string }>({
      query: ({ swarmId }) => ({
        url: `/${encodeURIComponent(swarmId)}/deploy`,
        method: 'POST',
      }),
      transformResponse: (resp: { success: boolean; data: SwarmSession }) => resp.data,
      invalidatesTags: ['Swarm'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(attackApi.util.invalidateTags(['AttackMarch']));
        } catch {
          // mutation-level errors handled by caller
        }
      },
    }),
    abortSwarm: builder.mutation<SwarmSession, { swarmId: string }>({
      query: ({ swarmId }) => ({
        url: `/${encodeURIComponent(swarmId)}/abort`,
        method: 'POST',
      }),
      transformResponse: (resp: { success: boolean; data: SwarmSession }) => resp.data,
      invalidatesTags: ['Swarm'],
    }),
  }),
});

export const {
  useGetMySwarmQuery,
  useCreateSwarmMutation,
  useCommitSwarmSlotMutation,
  useDismissSwarmSlotMutation,
  useDeploySwarmMutation,
  useAbortSwarmMutation,
} = swarmApi;
