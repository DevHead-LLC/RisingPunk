import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_URL } from '../../config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    handle: string;
    level: number;
    experience: {
      current: number;
      nextLevel: number;
      total: number;
    };
    unlockedFeatures: {
      hackRig: boolean;
      researchCenter: boolean;
    };
  };
}

export interface ProfileResponse {
  handle: string;
  email: string;
  level: number;
  experience: {
    current: number;
    nextLevel: number;
    total: number;
  };
  unlockedFeatures: {
    hackRig: boolean;
    researchCenter: boolean;
  };
}

export interface UnlockResearchCenterResponse {
  success: boolean;
  balance: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
  researchCenterBuild: {
    startedAt: string;
    completesAt: string;
  };
  unlockedFeatures: {
    hackRig: boolean;
    researchCenter: boolean;
  };
}

export interface ResearchCenterStatusResponse {
  isUnlocked: boolean;
  buildStatus: {
    startedAt: string;
    completesAt: string;
    timeRemaining: number;
  } | null;
}

export interface RentalHousingStatusResponse {
  propertyId: number;
  isUnlocked: boolean;
  isBuilding: boolean;
  buildStatus: {
    startedAt: string;
    completesAt: string;
  } | null;
  canBuild: boolean;
}

export interface UnlockRentalHousingResponse {
  success: boolean;
  message: string;
  buildStatus: {
    startedAt: string;
    completesAt: string;
  };
  newBalance: number;
}

export interface CompleteRentalHousingResponse {
  success: boolean;
  message: string;
  propertyId: number;
  isUnlocked: boolean;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth?.token;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/api/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    getProfile: builder.query<ProfileResponse, void>({
      query: () => '/api/users/profile',
      providesTags: ['User'],
    }),

    unlockHackRig: builder.mutation<void, void>({
      query: () => ({
        url: '/api/users/unlock-hack-rig',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    unlockResearchCenter: builder.mutation<UnlockResearchCenterResponse, void>({
      query: () => ({
        url: '/api/users/unlock-research-center',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    getResearchCenterStatus: builder.query<ResearchCenterStatusResponse, void>({
      query: () => '/api/users/research-center-status',
      providesTags: ['User'],
    }),

    getRentalHousingStatus: builder.query<RentalHousingStatusResponse, number>({
      query: (propertyId) => `/api/users/rental-housing-status/${propertyId}`,
      providesTags: (result, error, propertyId) => [
        { type: 'User', id: `rentalHousingStatus-${propertyId}` }
      ],
    }),

    unlockRentalHousing: builder.mutation<UnlockRentalHousingResponse, number>({
      query: (propertyId) => ({
        url: `/api/users/unlock-rental-housing/${propertyId}`,
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    completeRentalHousing: builder.mutation<CompleteRentalHousingResponse, number>({
      query: (propertyId) => ({
        url: `/api/users/complete-rental-housing/${propertyId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, propertyId) => [
        { type: 'User', id: `rentalHousingStatus-${propertyId}` }
      ],
    }),

    completeOnboarding: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/api/auth/onboarding-complete',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUnlockHackRigMutation,
  useUnlockResearchCenterMutation,
  useGetResearchCenterStatusQuery,
  useGetRentalHousingStatusQuery,
  useUnlockRentalHousingMutation,
  useCompleteRentalHousingMutation,
  useCompleteOnboardingMutation,
} = authApi;
