import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';
import { API_URL } from '../../config';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';

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
      garage?: number;
    };
    roomLevels?: {
      bathroom: number;
      kitchen: number;
      bedroom: number;
      livingRoom: number;
      garage?: number;
    };
  }[];
}

const rentalHousingBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: `${API_URL}/api/rental-housing`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);
  if (handle426IfNeeded(result, api)) return result;
  return result;
};

export const rentalHousingApi = createApi({
  reducerPath: 'rentalHousingApi',
  baseQuery: rentalHousingBaseQuery,
  tagTypes: ['RentalHousingIncome'],
  endpoints: (builder) => ({
    getRentalHousingIncome: builder.query<RentalHousingIncome, void>({
      query: () => '/income',
      providesTags: ['RentalHousingIncome'],
    }),
  }),
});

export const { useGetRentalHousingIncomeQuery } = rentalHousingApi;
