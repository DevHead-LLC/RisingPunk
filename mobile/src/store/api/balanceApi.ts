import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';

// Custom base query with error handling for balanceApi
const balanceBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {headers.set('Authorization', `Bearer ${token}`);}
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    // Check for account switched error first
    if ((result.error as any).status === 401 && (result.error as any).data?.error === 'ACCOUNT_SWITCHED') {
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      
      // Clear RTK Query caches to prevent data leakage between users
      resetAllApiCaches(api);
      
      return result; // Return early to prevent other error handling
    } else {
      globalErrorHandler.handleDatabaseError(result.error);
    }
  }

  return result;
};

export const balanceApi = createApi({
  reducerPath: 'balanceApi',
  baseQuery: balanceBaseQuery,
  tagTypes: ['Balance'],
  endpoints: (builder) => ({
    fetchBalance: builder.query<{ total: number; ratePerSecond: number; lastUpdated: string | Date; fractionalRemainder: number }, void>({
      query: () => '/api/balance',
      providesTags: ['Balance'],
    }),
  }),
});

export const { useFetchBalanceQuery } = balanceApi;
