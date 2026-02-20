import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

const antivirusBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);
  if (result.error && handle426IfNeeded(result, api)) {}
  return result;
};

export const antivirusApi = createApi({
  reducerPath: 'antivirusApi',
  baseQuery: antivirusBaseQuery,
  tagTypes: ['AntivirusShield'],
  endpoints: (builder) => ({
    getShieldStatus: builder.query<{
      isActive: boolean;
      shieldStatus: {
        startedAt: string;
        completesAt: string;
        timeRemaining: number;
      } | null;
      cooldownStatus: {
        cooldownUntil: string;
        timeRemaining: number;
      } | null;
    }, void>({
      query: () => '/api/antivirus-shield/status',
      providesTags: ['AntivirusShield'],
    }),
    activateShield: builder.mutation<{
      success: boolean;
      balance: {
        total: number;
        ratePerSecond: number;
        lastUpdated: string;
        fractionalRemainder: number;
      };
      antivirusShield: {
        active: boolean;
        startedAt: string;
        completesAt: string;
      };
    }, { optionId: string }>({
      query: (body) => ({
        url: '/api/antivirus-shield/activate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AntivirusShield'],
    }),
    deactivateShield: builder.mutation<{
      success: boolean;
      antivirusShield: {
        active: boolean;
        cooldownUntil: string;
      };
    }, void>({
      query: () => ({
        url: '/api/antivirus-shield/deactivate',
        method: 'POST',
      }),
      invalidatesTags: ['AntivirusShield'],
    }),
  }),
});

export const { useGetShieldStatusQuery, useActivateShieldMutation, useDeactivateShieldMutation } = antivirusApi;
