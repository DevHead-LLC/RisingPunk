import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';

export interface LoginRequest {
  handle: string;
  accessKey: string;
}

export interface RegisterRequest {
  email: string;
  handle: string;
  accessKey: string;
}

export interface GoogleSignInRequest {
  idToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface AuthResponse {
  token: string;
  user: {
    handle: string;
    email: string;
    level: number;
    unlockedFeatures: {
      hackRig: boolean;
    };
    onboardingCompleted: boolean;
    needsHandleSelection: boolean;
  };
}

export interface ProfileResponse {
  handle: string;
  email: string;
  emailVerified: boolean;
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
  profileGender: 'male' | 'female';
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

// Custom base query with error handling for authApi
const authBaseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
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
  })(args, api, extraOptions);

  if (result.error) {
    console.log('🔍 AUTH API: Error received:', {
      status: result.error?.status,
      data: result.error?.data,
      error: result.error?.data?.error
    });
    
    // Check for account switched error first
    if (result.error?.status === 401 && result.error?.data?.error === 'ACCOUNT_SWITCHED') {
      console.log('🔍 AUTH API: ACCOUNT_SWITCHED detected, dispatching action');
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      return result; // Return early to prevent other error handling
    } else {
      console.log('🔍 AUTH API: Not ACCOUNT_SWITCHED, calling globalErrorHandler');
      globalErrorHandler.handleDatabaseError(result.error);
    }
  }

  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: authBaseQuery,
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

    googleSignIn: builder.mutation<AuthResponse, GoogleSignInRequest>({
      query: (data) => ({
        url: '/api/auth/google-signin',
        method: 'POST',
        body: data,
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

    deleteAccount: builder.mutation<{ success: boolean; message: string }, { handle: string }>({
      query: (data) => ({
        url: '/api/users/account',
        method: 'DELETE',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    forgotPassword: builder.mutation<{ message: string }, ForgotPasswordRequest>({
      query: (data) => ({
        url: '/api/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleSignInMutation,
  useGetProfileQuery,
  useUnlockHackRigMutation,
  useUnlockResearchCenterMutation,
  useGetResearchCenterStatusQuery,
  useGetRentalHousingStatusQuery,
  useUnlockRentalHousingMutation,
  useCompleteRentalHousingMutation,
  useCompleteOnboardingMutation,
  useDeleteAccountMutation,
  useForgotPasswordMutation,
} = authApi;
