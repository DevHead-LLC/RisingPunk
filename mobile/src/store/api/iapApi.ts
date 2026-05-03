import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { resetAllApiCaches } from './resetApiCaches';

let iapAccountSwitchedDispatched = false;
let iapAccountSwitchedTimeout: number | null = null;

export type IapVerifyDeveloperSupportBody =
  | { platform: 'apple'; signedTransactionInfo: string }
  | { platform: 'google'; productId: string; purchaseToken: string };

export type IapVerifyDeveloperSupportResponse = {
  ledgerId: string;
  supporter: boolean;
  duplicate: boolean;
};

export type IapLedgerRowDto = {
  id: string;
  platform: string;
  storeProductId: string;
  transactionId: string;
  currency: string;
  amountMinorUnits: number;
  remainingMinorUnits: number;
  createdAt: string;
};

export type IapLedgerResponse = {
  supporter: boolean;
  rows: IapLedgerRowDto[];
};

const iapBaseQuery = async (args: unknown, api: unknown, extraOptions: unknown) => {
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
  const error = (result as { error?: { status?: number; data?: { error?: string } } }).error;
  if (error?.status === 401 && error?.data?.error === 'ACCOUNT_SWITCHED') {
    if (!iapAccountSwitchedDispatched) {
      iapAccountSwitchedDispatched = true;
      (api as { dispatch: (action: unknown) => void }).dispatch({ type: 'auth/handleAccountSwitched' });
      resetAllApiCaches(api);
      if (iapAccountSwitchedTimeout) {
        clearTimeout(iapAccountSwitchedTimeout);
      }
      iapAccountSwitchedTimeout = setTimeout(() => {
        iapAccountSwitchedDispatched = false;
      }, 2000);
    }
    return result;
  }
  if (error?.status === 401 && error?.data?.error === 'Token expired') {
    (api as { dispatch: (action: unknown) => void }).dispatch({ type: 'auth/logout' });
    return result;
  }
  return result;
};

export const iapApi = createApi({
  reducerPath: 'iapApi',
  baseQuery: iapBaseQuery,
  tagTypes: ['IapDeveloperSupportLedger'],
  endpoints: (builder) => ({
    verifyDeveloperSupport: builder.mutation<IapVerifyDeveloperSupportResponse, IapVerifyDeveloperSupportBody>({
      query: (body) => ({
        url: '/api/iap/developer-support/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['IapDeveloperSupportLedger'],
    }),
    fetchDeveloperSupportLedger: builder.query<IapLedgerResponse, void>({
      query: () => '/api/iap/developer-support/ledger',
      providesTags: ['IapDeveloperSupportLedger'],
    }),
  }),
});

export const { useVerifyDeveloperSupportMutation, useFetchDeveloperSupportLedgerQuery } = iapApi;
