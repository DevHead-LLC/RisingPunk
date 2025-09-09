import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import { RootState } from '../index';

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
    startResearch: builder.mutation<StartResearchResponse, string>({
      query: (featureId) => ({
        url: `/start-research/${featureId}`,
        method: 'POST',
      }),
      transformResponse: (response: { success: boolean; data: StartResearchResponse }) => response.data,
      invalidatesTags: (result, error, featureId) => [
        { type: 'ResearchFeature', id: featureId },
        { type: 'ResearchFeatures', id: 'home-defense' } // Invalidate the specific category
      ],
    }),
    completeResearch: builder.mutation<CompleteResearchResponse, string>({
      query: (featureId) => ({
        url: `/complete-research/${featureId}`,
        method: 'POST',
      }),
      transformResponse: (response: { success: boolean; data: CompleteResearchResponse }) => response.data,
      invalidatesTags: (result, error, featureId) => [
        { type: 'ResearchFeature', id: featureId },
        { type: 'ResearchFeatures', id: 'home-defense' } // Invalidate the specific category
      ],
    }),
  }),
});

export const { 
  useGetFeatureStatusQuery, 
  useGetFeaturesQuery,
  useStartResearchMutation, 
  useCompleteResearchMutation 
} = researchFeaturesApi;
