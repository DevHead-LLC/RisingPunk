import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';

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

export interface UserProfileResponse {
  userId: string;
  handle: string;
  level: number;
  profileGender: 'male' | 'female';
}

export interface UnlockResearchCenterResponse {
  success: boolean;
  balance: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
    fractionalRemainder: number;
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
    
    // Check for account switched error first
    if (result.error?.status === 401 && (result.error?.data as any)?.error === 'ACCOUNT_SWITCHED') {
      // Always dispatch account switched action - the auth slice will handle showing banner appropriately
      api.dispatch({ type: 'auth/handleAccountSwitched' });
      
      // Clear RTK Query caches to prevent data leakage between users
      resetAllApiCaches(api);
      
      return result; // Return early to prevent other error handling
    } else if (result.error?.status === 401 && (result.error?.data as any)?.error === 'Token expired') {
      // Dispatch logout action using action type to avoid circular dependency
      api.dispatch({ type: 'auth/logout' });
      return result;
    } else {
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

    getUserProfile: builder.query<UserProfileResponse, string>({
      query: (userId) => `/api/users/profile/${userId}`,
      providesTags: (result, error, userId) => [
        { type: 'User', id: `profile-${userId}` }
      ],
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

    createCrew: builder.mutation<{ success: boolean; crew: { id: string; crewName: string; crewIdentifier: string; nativeLanguage: string } }, { crewName: string; crewIdentifier: string; nativeLanguage: string }>({
      query: (data) => ({
        url: '/api/crew/create',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    getCrewStatus: builder.query<{ isInCrew: boolean; crewId: string | null; crewIdentifier: string | null; role: 'president' | 'member' | null; appliedCrewId: string | null; appliedCrewIdentifier: string | null }, void>({
      query: () => '/api/crew/status',
      providesTags: ['User'],
      refetchOnMountOrArgChange: true,
    }),

    getUserCrewStatus: builder.query<{ isInCrew: boolean; crewId: string | null; crewIdentifier: string | null; role: 'president' | 'member' | 'executive' | null }, string>({
      query: (userId) => `/api/crew/status/${userId}`,
      providesTags: ['User'],
    }),

    applyToCrew: builder.mutation<{ success: boolean; message: string }, { crewId: string }>({
      query: (data) => ({
        url: '/api/crew/apply',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    withdrawApplication: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/api/crew/withdraw-application',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    disbandCrew: builder.mutation<{ success: boolean; message: string }, { crewIdentifier: string }>({
      query: (data) => ({
        url: '/api/crew/disband',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    searchCrews: builder.query<{ crews: Array<{ id: string; crewName: string; crewIdentifier: string; nativeLanguage: string; memberCount: number; createdAt: string }> }, string>({
      query: (query) => `/api/crew/search?q=${encodeURIComponent(query)}`,
      providesTags: ['User'],
    }),

    getSuggestedCrews: builder.query<{ crews: Array<{ id: string; crewName: string; crewIdentifier: string; nativeLanguage: string; memberCount: number; createdAt: string }> }, void>({
      query: () => '/api/crew/suggested',
      providesTags: ['User'],
    }),

    getCrewDetails: builder.query<{ success: boolean; crew: { id: string; crewName: string; crewIdentifier: string; nativeLanguage: string; createdAt: string | null; memberCount: number; applicants: Array<{ userId: string; handle: string; appliedAt: string }>; crewRules: string[]; internalMessage: string; externalMessage: string; president: { userId: string; handle: string; level: number } | null; executives: Array<{ userId: string; handle: string; level: number }>; members: Array<{ userId: string; handle: string; level: number }> } }, string>({
      query: (crewId) => `/api/crew/${crewId}`,
      providesTags: ['User'],
      refetchOnMountOrArgChange: true,
    }),

    updateCrewRules: builder.mutation<{ success: boolean; crewRules: string[] }, { crewId: string; crewRules: string[] }>({
      query: (data) => ({
        url: `/api/crew/${data.crewId}/rules`,
        method: 'PUT',
        body: { crewRules: data.crewRules },
      }),
      invalidatesTags: ['User'],
    }),

    acceptApplicant: builder.mutation<{ success: boolean; message: string }, { crewId: string; applicantUserId: string }>({
      query: (data) => ({
        url: '/api/crew/accept-applicant',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    denyApplicant: builder.mutation<{ success: boolean; message: string }, { crewId: string; applicantUserId: string }>({
      query: (data) => ({
        url: '/api/crew/deny-applicant',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    leaveCrew: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/api/crew/leave',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),

    updateCrewName: builder.mutation<{ success: boolean; message: string; crew: { id: string; crewName: string; crewIdentifier: string } }, { crewName: string }>({
      query: (data) => ({
        url: '/api/crew/update-name',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    updateCrewIdentifier: builder.mutation<{ success: boolean; message: string; crew: { id: string; crewName: string; crewIdentifier: string } }, { crewIdentifier: string }>({
      query: (data) => ({
        url: '/api/crew/update-identifier',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    updateCrewLanguage: builder.mutation<{ success: boolean; message: string; crew: { id: string; crewName: string; crewIdentifier: string; nativeLanguage: string } }, { nativeLanguage: string }>({
      query: (data) => ({
        url: '/api/crew/update-language',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    updateInternalMessage: builder.mutation<{ success: boolean; message: string; crew: { id: string; internalMessage: string } }, { internalMessage: string }>({
      query: (data) => ({
        url: '/api/crew/update-internal-message',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    updateExternalMessage: builder.mutation<{ success: boolean; message: string; crew: { id: string; externalMessage: string } }, { externalMessage: string }>({
      query: (data) => ({
        url: '/api/crew/update-external-message',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    giftAllMembers: builder.mutation<{ success: boolean; message: string; giftAmount: number; transactionFee: number; totalCost: number; baseAmountPerMember: number; remainder: number; memberCount: number; newBalance: number; lastUpdated: string | Date; fractionalRemainder: number }, { giftAmount: number }>({
      query: (data) => ({
        url: '/api/crew/gift-all-members',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    promoteMember: builder.mutation<{ success: boolean; message: string; crew: { id: string; executives: Array<{ userId: string; handle: string; level: number }>; members: Array<{ userId: string; handle: string; level: number }> } }, { crewId: string; memberUserId: string }>({
      query: (data) => ({
        url: '/api/crew/promote-member',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    demoteExecutive: builder.mutation<{ success: boolean; message: string; crew: { id: string; executives: Array<{ userId: string; handle: string; level: number }>; members: Array<{ userId: string; handle: string; level: number }> } }, { crewId: string; executiveUserId: string }>({
      query: (data) => ({
        url: '/api/crew/demote-executive',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    chooseSuccessor: builder.mutation<{ success: boolean; message: string; crew: { id: string; president: { userId: string; handle: string; level: number } | null; executives: Array<{ userId: string; handle: string; level: number }>; members: Array<{ userId: string; handle: string; level: number }> } }, { crewId: string; successorUserId: string }>({
      query: (data) => ({
        url: '/api/crew/choose-successor',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    resign: builder.mutation<{ success: boolean; message: string; crew: { id: string; president: { userId: string; handle: string; level: number } | null; executives: Array<{ userId: string; handle: string; level: number }>; members: Array<{ userId: string; handle: string; level: number }> } }, { crewId: string }>({
      query: (data) => ({
        url: '/api/crew/resign',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleSignInMutation,
  useGetProfileQuery,
  useGetUserProfileQuery,
  useUnlockHackRigMutation,
  useUnlockResearchCenterMutation,
  useGetResearchCenterStatusQuery,
  useGetRentalHousingStatusQuery,
  useUnlockRentalHousingMutation,
  useCompleteRentalHousingMutation,
  useCompleteOnboardingMutation,
  useDeleteAccountMutation,
  useForgotPasswordMutation,
  useCreateCrewMutation,
  useGetCrewStatusQuery,
  useGetUserCrewStatusQuery,
  useDisbandCrewMutation,
  useSearchCrewsQuery,
  useGetSuggestedCrewsQuery,
  useApplyToCrewMutation,
  useWithdrawApplicationMutation,
  useGetCrewDetailsQuery,
  useAcceptApplicantMutation,
  useDenyApplicantMutation,
  useLeaveCrewMutation,
  useUpdateCrewNameMutation,
  useUpdateCrewIdentifierMutation,
  useUpdateCrewLanguageMutation,
  useUpdateInternalMessageMutation,
  useUpdateExternalMessageMutation,
  useGiftAllMembersMutation,
  usePromoteMemberMutation,
  useDemoteExecutiveMutation,
  useChooseSuccessorMutation,
  useResignMutation,
  useUpdateCrewRulesMutation,
} = authApi;
