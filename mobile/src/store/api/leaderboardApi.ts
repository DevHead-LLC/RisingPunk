import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';

export interface LeaderboardUser {
  rank: number;
  handle: string;
  level: number;
  botsDestroyed?: number;
  netWorth?: number;
}

export interface LeaderboardCrew {
  rank: number;
  crewName: string;
  crewIdentifier: string;
  botsDestroyed?: number;
  netWorth?: number;
  memberCount: number;
}

export interface IndividualLeaderboardResponse {
  users: LeaderboardUser[];
  lastUpdated: string;
}

export interface CrewLeaderboardResponse {
  crews: LeaderboardCrew[];
  lastUpdated: string;
}

const calculateNextPollTime = (): number => {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  
  const nextQuarter = Math.ceil(minutes / 15) * 15;
  const nextTime = new Date(now);
  nextTime.setMinutes(nextQuarter, 0, 0);
  
  if (nextQuarter >= 60) {
    nextTime.setHours(nextTime.getHours() + 1);
    nextTime.setMinutes(0, 0, 0);
  }
  
  const timeUntilNext = nextTime.getTime() - now.getTime();
  
  if (timeUntilNext < 60000) {
    return 900000;
  }
  
  return timeUntilNext;
};

export const leaderboardApi = createApi({
  reducerPath: 'leaderboardApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      setAppVersionHeader(headers);
      return headers;
    },
  }),
  tagTypes: ['Leaderboard'],
  endpoints: (builder) => ({
    getIndividualBotsDestroyedLeaderboard: builder.query<IndividualLeaderboardResponse, void>({
      query: () => '/api/leaderboard/individual/bots-destroyed',
      providesTags: ['Leaderboard'],
    }),
    getIndividualNetWorthLeaderboard: builder.query<IndividualLeaderboardResponse, void>({
      query: () => '/api/leaderboard/individual/net-worth',
      providesTags: ['Leaderboard'],
    }),
    getCrewBotsDestroyedLeaderboard: builder.query<CrewLeaderboardResponse, void>({
      query: () => '/api/leaderboard/crew/bots-destroyed',
      providesTags: ['Leaderboard'],
    }),
    getCrewNetWorthLeaderboard: builder.query<CrewLeaderboardResponse, void>({
      query: () => '/api/leaderboard/crew/net-worth',
      providesTags: ['Leaderboard'],
    }),
  }),
});

export const {
  useGetIndividualBotsDestroyedLeaderboardQuery,
  useGetIndividualNetWorthLeaderboardQuery,
  useGetCrewBotsDestroyedLeaderboardQuery,
  useGetCrewNetWorthLeaderboardQuery,
} = leaderboardApi;

