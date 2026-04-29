import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

export type TransferRunItemPayload = {
  itemKey: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
};

export type TransferRunState = 'outbound' | 'resolving' | 'delivered' | 'failed' | 'cancelled';

/** GET /transfer-runs/active — positions/timing only (no user ids or amounts). */
export type TransferRunActivePublic = {
  transferRunId: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  state: TransferRunState;
  departAt: string;
  arriveAt: string;
  totalTravelSeconds: number;
};

export type TransferRunListItem = TransferRunActivePublic & {
  senderId: string;
  recipientId: string;
  totalTransferValue: number;
  feeAmount: number;
  walletAmount?: number;
  itemPayload?: TransferRunItemPayload[];
};

const transferRunBaseQuery = async (args: any, api: any, extraOptions: any) => {
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

export const transferRunApi = createApi({
  reducerPath: 'transferRunApi',
  baseQuery: transferRunBaseQuery,
  tagTypes: ['TransferRuns'],
  endpoints: (builder) => ({
    getActiveTransferRuns: builder.query<{ runs: TransferRunActivePublic[] }, void>({
      query: () => '/api/transfer-runs/active',
      providesTags: ['TransferRuns'],
    }),
    getMyTransferRuns: builder.query<{ runs: TransferRunListItem[] }, void>({
      query: () => '/api/transfer-runs/mine',
      providesTags: ['TransferRuns'],
    }),
    quoteTransferRun: builder.mutation<
      {
        walletAmount: number;
        itemValueTotal: number;
        totalTransferValue: number;
        feeAmount: number;
        totalSenderCashDebit: number;
        itemPayload: TransferRunItemPayload[];
        feeRate: number;
        feePolicyNote: string;
      },
      { walletAmount: number; items: Array<{ itemKey: string; quantity: number }> }
    >({
      query: (body) => ({
        url: '/api/transfer-runs/quote',
        method: 'POST',
        body,
      }),
    }),
    launchTransferRun: builder.mutation<
      {
        success: true;
        transferRunId: string;
        departAt: string;
        arriveAt: string;
        distanceDu: number;
        secondsPerDu: number;
        totalTravelSeconds: number;
        feeAmount: number;
        totalTransferValue: number;
        totalSenderCashDebit: number;
        feePolicyNote: string;
      },
      {
        recipientUserId: string;
        recipientTargetX: number;
        recipientTargetY: number;
        walletAmount: number;
        items: Array<{ itemKey: string; quantity: number }>;
      }
    >({
      query: (body) => ({
        url: '/api/transfer-runs/launch',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TransferRuns'],
    }),
    cancelTransferRun: builder.mutation<{ success: true; message: string }, { transferRunId: string }>({
      query: ({ transferRunId }) => ({
        url: `/api/transfer-runs/${encodeURIComponent(transferRunId)}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['TransferRuns'],
    }),
  }),
});

export const {
  useGetActiveTransferRunsQuery,
  useGetMyTransferRunsQuery,
  useQuoteTransferRunMutation,
  useLaunchTransferRunMutation,
  useCancelTransferRunMutation,
} = transferRunApi;
