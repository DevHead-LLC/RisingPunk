import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';
import { API_URL } from '../../config';

export interface RentalHousingIncome {
  totalIncomePerSecond: number;
  propertyBreakdown: {
    propertyId: number;
    isUnlocked: boolean;
    propertyLevel?: number;
    incomePerSecond: number;
    roomValues: {
      bathroom: number;
      kitchen: number;
      bedroom: number;
      livingRoom: number;
    };
    roomLevels?: {
      bathroom: number;
      kitchen: number;
      bedroom: number;
      livingRoom: number;
    };
  }[];
}

export const rentalHousingApi = createApi({
  reducerPath: 'rentalHousingApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/rental-housing`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['RentalHousingIncome'],
  endpoints: (builder) => ({
    getRentalHousingIncome: builder.query<RentalHousingIncome, void>({
      query: () => '/income',
      providesTags: ['RentalHousingIncome'],
    }),
  }),
});

export const { useGetRentalHousingIncomeQuery } = rentalHousingApi;
