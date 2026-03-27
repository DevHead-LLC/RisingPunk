import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { API_URL } from '../../config';
import { RootState } from '../index';
import { balanceApi } from './balanceApi';
import { userGuideApi } from './userGuideApi';
import { botsApi } from './botsApi';

export interface ResearchFeatureStatus {
  featureId: string;
  name: string;
  isUnlocked: boolean;
  unlockCost: number;
  levelRequirement: number;
  researchTimeHours: number;
}

export interface StartResearchResponse {
  researchStartedAt: string;
  researchCompletesAt: string;
  researchTimeHours: number;
  newBalance?: number;
}

export interface CompleteResearchResponse {
  featureId: string;
  isUnlocked: boolean;
  unlockedAt: string;
}

export interface SpeedupFeatureResearchResponse {
  success: boolean;
  message: string;
  newBalance: number;
}

/** Cash-flow feature IDs (spec 18) that affect balance/expense modifiers; used to invalidate balance cache on complete/speedup. Excludes legacy financial/reduce-expenses (categoryId is always cash-flow in these mutations). */
const CASH_FLOW_SYNC_FEATURE_IDS: readonly string[] = ['increase-income-01', 'increase-income-02', 'increase-income-025', 'increase-income-03', 'increase-income-03-ii', 'increase-income-03-iii', 'increase-income-03-iv', 'increase-income-03-v', 'increase-income-05', 'increase-income-10-i', 'increase-income-10-ii', 'reduce-insurance-01', 'reduce-insurance-02', 'reduce-insurance-03', 'reduce-rent-mortgage-05', 'reduce-tax-expense-02'];

/** Investments feature IDs that affect rental income (spec 18). */
const INVESTMENTS_SYNC_FEATURE_IDS: readonly string[] = ['rental-profit-01', 'rental-profit-015', 'rental-profit-02-i', 'rental-profit-02-ii', 'rental-profit-02-iii'];

const researchBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: `${API_URL}/api/research`,
    prepareHeaders: (headers, { getState, endpoint }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      if (endpoint === 'getUserFeatures') {
        headers.set('X-Research-API-Version', '2');
      }
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);
  if (handle426IfNeeded(result, api)) return result;
  return result;
};

export const researchFeaturesApi = createApi({
  reducerPath: 'researchFeaturesApi',
  baseQuery: researchBaseQuery,
  tagTypes: ['ResearchFeature', 'ResearchFeatures', 'ExpenseModifiers'],
  endpoints: (builder) => ({
    getExpenseModifiers: builder.query<{ insuranceReduction: number; taxReduction: number; rentMortgageReduction: number }, void>({
      query: () => '/expense-modifiers',
      providesTags: ['ExpenseModifiers'],
    }),
    getFeatureStatus: builder.query<ResearchFeatureStatus, string>({
      query: (featureId) => `/feature-status/${featureId}`,
      transformResponse: (response: { success: boolean; data: ResearchFeatureStatus }) => response.data,
      providesTags: (result, error, featureId) => [{ type: 'ResearchFeature', id: featureId }],
    }),
    getFeatures: builder.query<any[], string>({
      query: (categoryId) => `/features/${categoryId}`,
      transformResponse: (response: { success: boolean; data: any[] }) => response.data,
      providesTags: (result, error, categoryId) => [{ type: 'ResearchFeatures', id: categoryId }],
    }),
    getUserFeatures: builder.query<any[], string>({
      query: (categoryId) => `/user-features/${categoryId}`,
      transformResponse: (response: { success: boolean; data: any[] }) => response.data,
      providesTags: (result, error, categoryId) => [{ type: 'ResearchFeatures', id: categoryId }],
      keepUnusedDataFor: 300,
    }),
    startResearch: builder.mutation<StartResearchResponse, { categoryId: string; featureId: string }>({
      query: ({ categoryId, featureId }) => ({
        url: `/start-feature-research`,
        method: 'POST',
        body: { categoryId, featureId },
      }),
      transformResponse: (response: { success: boolean; data: StartResearchResponse; newBalance?: number }) => ({
        ...response.data,
        newBalance: response.newBalance
      }),
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ResearchFeatures', id: categoryId }
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate Balance tag from balanceApi to ensure fresh balance data
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    completeResearch: builder.mutation<CompleteResearchResponse, { categoryId: string; featureId: string }>({
      query: ({ categoryId, featureId }) => ({
        url: `/complete-feature-research`,
        method: 'POST',
        body: { categoryId, featureId },
      }),
      transformResponse: (response: { success: boolean; data: CompleteResearchResponse }) => response.data,
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ResearchFeatures', id: categoryId },
        ...(categoryId === 'cash-flow' ? [{ type: 'ExpenseModifiers' as const }] : [])
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate UserTaskProgress to update task guide when research completes
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
          // Hack Ability (e.g. mark-2-bots): refresh bot stat caches so Profile / Digital Barracks align immediately
          if (arg.categoryId === 'hack-ability') {
            dispatch(botsApi.endpoints.fetchBotStats.initiate(undefined, { forceRefetch: true }));
            dispatch(botsApi.endpoints.fetchBotStatsBreakdown.initiate(undefined, { forceRefetch: true }));
          }
          // ExpenseModifiers already invalidated declaratively via invalidatesTags for cash-flow
          // If rental profit research completed (spec 18), invalidate balance and rental housing income cache
          if (arg.categoryId === 'investments' && INVESTMENTS_SYNC_FEATURE_IDS.includes(arg.featureId)) {
            const { balanceApi } = await import('./balanceApi');
            const { rentalHousingApi } = await import('./rentalHousingApi');
            dispatch(balanceApi.util.invalidateTags(['Balance']));
            dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
          }
          // If cash-flow income/insurance/tax research completed (spec 18), invalidate balance cache
          if (arg.categoryId === 'cash-flow' && CASH_FLOW_SYNC_FEATURE_IDS.includes(arg.featureId)) {
            const { balanceApi } = await import('./balanceApi');
            dispatch(balanceApi.util.invalidateTags(['Balance']));
          }
        } catch {
          // Error handling is done by the mutation itself
        }
      },
    }),
    speedupFeatureResearch: builder.mutation<SpeedupFeatureResearchResponse, { categoryId: string; featureId: string }>({
      query: ({ categoryId, featureId }) => ({
        url: `/speedup-feature-research`,
        method: 'POST',
        body: { categoryId, featureId },
      }),
      transformResponse: (response: { success: boolean; message: string; newBalance: number }) => {
        // Server returns response directly, not wrapped in data
        return {
          success: response.success,
          message: response.message,
          newBalance: response.newBalance
        };
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate Balance tag from balanceApi to ensure fresh balance data
          dispatch(balanceApi.util.invalidateTags(['Balance']));
          // Invalidate UserTaskProgress to update task guide when research completes
          // This ensures tasks like unlock-antivirus update immediately when feature is unlocked
          dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
          if (arg.categoryId === 'hack-ability') {
            dispatch(botsApi.endpoints.fetchBotStats.initiate(undefined, { forceRefetch: true }));
            dispatch(botsApi.endpoints.fetchBotStatsBreakdown.initiate(undefined, { forceRefetch: true }));
          }
          // If rental profit research was speeded up (spec 18), invalidate balance and rental housing income cache
          if (arg.categoryId === 'investments' && INVESTMENTS_SYNC_FEATURE_IDS.includes(arg.featureId)) {
            const { rentalHousingApi } = await import('./rentalHousingApi');
            dispatch(balanceApi.util.invalidateTags(['Balance']));
            dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
          }
          // If cash-flow income/insurance/tax research was speeded up (spec 18), invalidate balance cache
          if (arg.categoryId === 'cash-flow' && CASH_FLOW_SYNC_FEATURE_IDS.includes(arg.featureId)) {
            dispatch(balanceApi.util.invalidateTags(['Balance']));
          }
        } catch {
          // Error handling is done by the mutation itself
        }
      },
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ResearchFeatures', id: categoryId },
        ...(categoryId === 'cash-flow' ? [{ type: 'ExpenseModifiers' as const }] : [])
      ],
    }),
  }),
});

export const { 
  useGetFeatureStatusQuery, 
  useGetFeaturesQuery,
  useGetUserFeaturesQuery,
  useGetExpenseModifiersQuery,
  useStartResearchMutation, 
  useCompleteResearchMutation,
  useSpeedupFeatureResearchMutation
} = researchFeaturesApi;
