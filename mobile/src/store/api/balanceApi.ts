import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';

export const balanceApi = createApi({
  reducerPath: 'balanceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any)?.auth?.token;
      if (token) {headers.set('Authorization', `Bearer ${token}`);}
      return headers;
    },
  }),
  tagTypes: ['Balance'],
  endpoints: (builder) => ({
    fetchBalance: builder.query<{ total: number; ratePerSecond: number; lastUpdated: string | Date }, void>({
      query: () => '/api/balance',
      providesTags: ['Balance'],
    }),
  }),
});

export const { useFetchBalanceQuery } = balanceApi;
