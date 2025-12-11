import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { RootState } from '../index';
import { balanceApi } from './balanceApi';

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

export const researchFeaturesApi = createApi({
  reducerPath: 'researchFeaturesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/api/research`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['ResearchFeature', 'ResearchFeatures'],
  endpoints: (builder) => ({
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
    }),
    startResearch: builder.mutation<StartResearchResponse, { categoryId: string; featureId: string }>({
      query: ({ categoryId, featureId }) => ({
        url: `/start-feature-research`,
        method: 'POST',
        body: { categoryId, featureId },
      }),
      transformResponse: (response: { success: boolean; data: StartResearchResponse }) => response.data,
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ResearchFeatures', id: categoryId }
      ],
    }),
    completeResearch: builder.mutation<CompleteResearchResponse, { categoryId: string; featureId: string }>({
      query: ({ categoryId, featureId }) => ({
        url: `/complete-feature-research`,
        method: 'POST',
        body: { categoryId, featureId },
      }),
      transformResponse: (response: { success: boolean; data: CompleteResearchResponse }) => response.data,
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ResearchFeatures', id: categoryId }
      ],
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
        } catch {
          // Error handling is done by the mutation itself
        }
      },
      invalidatesTags: (result, error, { categoryId }) => [
        { type: 'ResearchFeatures', id: categoryId }
      ],
    }),
  }),
});

export const { 
  useGetFeatureStatusQuery, 
  useGetFeaturesQuery,
  useGetUserFeaturesQuery,
  useStartResearchMutation, 
  useCompleteResearchMutation,
  useSpeedupFeatureResearchMutation
} = researchFeaturesApi;
