import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import { API_URL } from '../../config';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';
import { resetAllApiCaches } from './resetApiCaches';
import { setAppVersionHeader } from './appVersionHeader';
import { handle426IfNeeded } from './handle426';
import { balanceApi } from './balanceApi';
import { updateBalance } from '../slices/balanceSlice';
import { setProgrammingFacilityUnlocked } from '../slices/authSlice';

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
      programmingFacility?: boolean;
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
    programmingFacility?: boolean;
  };
  profileGender: 'male' | 'female';
  totalGuardiansBuilt?: number;
}

export interface UserLookupResponse {
  userId: string;
  handle: string;
}

export interface UserProfileResponse {
  userId: string;
  handle: string;
  level: number;
  profileGender: 'male' | 'female';
  battleStats?: {
    botsDestroyed: number;
    botsLost: number;
    successfulAttacks: number;
    failedAttacks: number;
    successfulDefenses: number;
    failedDefenses: number;
  };
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
    targetLevel?: number;
  };
  unlockedFeatures: {
    hackRig: boolean;
    researchCenter: boolean;
    programmingFacility?: boolean;
  };
}

export interface UnlockProgrammingFacilityResponse {
  success: boolean;
  balance: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
  unlockedFeatures: {
    hackRig: boolean;
    researchCenter: boolean;
    programmingFacility: boolean;
  };
}

export interface ResearchCenterStatusResponse {
  isUnlocked: boolean;
  level: number;
  maxLevel: number;
  canBuild: boolean;
  nextBuildCost: number | null;
  nextBuildTimeMinutes: number | null;
  buildStatus: {
    startedAt: string;
    completesAt: string;
    timeRemaining: number;
    targetLevel?: number;
  } | null;
}

export interface RentalHousingStatusResponse {
  propertyId: number;
  isUnlocked: boolean;
  propertyLevel: number;
  nextBuildLevel: number | null;
  nextBuildCost: number | null;
  nextBuildTimeMinutes: number | null;
  isBuilding: boolean;
  buildStatus: {
    startedAt: string | null;
    completesAt: string | null;
    targetLevel?: number;
  } | null;
  canBuild: boolean;
  roomLevels?: {
    bathroom: number;
    kitchen: number;
    bedroom: number;
    livingRoom: number;
    garage?: number;
  };
  activeRemodel?: {
    propertyId: number;
    room: string;
    startedAt: string | null;
    completesAt: string | null;
    targetRoomLevel: number;
  } | null;
  /** Max property build level. UI stops offering upgrades at this level. */
  maxPropertyLevel?: number;
  /** Max room remodel level. From server construction_config. */
  maxRoomLevel?: number;
  /** Max garage room level (4). Garage remodels only up to this; main-floor rooms use maxRoomLevel. */
  maxGarageRoomLevel?: number;
  /** Room remodel tiers from server (cost, time, minPropertyLevel). Use for modal and gating. */
  roomRemodelLevels?: Array<{
    roomLevel: number;
    cost: number;
    constructionTimeMinutes: number;
    minPropertyLevel: number;
  }>;
}

export interface UnlockRentalHousingResponse {
  success: boolean;
  message: string;
  buildStatus: {
    startedAt: string;
    completesAt: string;
    targetLevel?: number;
  };
  newBalance: number;
}

export interface CompleteRentalHousingResponse {
  success: boolean;
  message: string;
  propertyId: number;
  propertyLevel?: number;
  isUnlocked: boolean;
  newBalance?: number;
  ratePerSecond?: number;
}

export interface SpeedupPropertyConstructionResponse {
  success: boolean;
  message: string;
  propertyId: number;
  isUnlocked: boolean;
  newBalance: number;
  ratePerSecond?: number;
}

export type RemodelRoomType = 'bathroom' | 'kitchen' | 'bedroom' | 'livingRoom' | 'garage';

export interface StartRemodelRequest {
  propertyId: number;
  room: RemodelRoomType;
}

export interface StartRemodelResponse {
  success: boolean;
  message: string;
  activeRemodel: { propertyId: number; room: string; startedAt: string; completesAt: string; targetRoomLevel: number };
  newBalance: number;
}

export interface CompleteRemodelResponse {
  success: boolean;
  message: string;
  propertyId: number;
  room: string;
  roomLevel: number;
  newBalance?: number;
  ratePerSecond?: number;
}

export interface SpeedupRemodelResponse {
  success: boolean;
  message: string;
  propertyId: number;
  room: string;
  newBalance: number;
  ratePerSecond?: number;
}

export interface SpeedupResearchCenterConstructionResponse {
  success: boolean;
  message: string;
  balance: {
    total: number;
    ratePerSecond: number;
    lastUpdated: string;
  };
  unlockedFeatures: {
    hackRig: boolean;
    researchCenter: boolean;
    programmingFacility?: boolean;
  };
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
      setAppVersionHeader(headers);
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    if (handle426IfNeeded(result, api)) return result;
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
  } else {
    globalErrorHandler.markServerReachable();
  }

  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: authBaseQuery,
  tagTypes: ['User', 'Crew', 'CrewChat'],
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

    /** Look up user by handle (exact match, case-insensitive). 404 if not found. */
    lookupUserByHandle: builder.query<UserLookupResponse, string>({
      query: (handle) => ({
        url: '/api/users/lookup',
        params: { handle: handle.trim() },
      }),
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

    unlockProgrammingFacility: builder.mutation<UnlockProgrammingFacilityResponse, void>({
      query: () => ({
        url: '/api/users/unlock-programming-facility',
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(updateBalance({
            total: data.balance.total,
            ratePerSecond: data.balance.ratePerSecond,
            lastUpdated: data.balance.lastUpdated,
          }));
          dispatch(setProgrammingFacilityUnlocked());
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        } catch {
          // Error handled by mutation
        }
      },
      invalidatesTags: ['User'],
    }),

    getResearchCenterStatus: builder.query<ResearchCenterStatusResponse, void>({
      query: () => '/api/users/research-center-status',
      providesTags: ['User'],
    }),

    speedupResearchCenterConstruction: builder.mutation<SpeedupResearchCenterConstructionResponse, void>({
      query: () => ({
        url: '/api/users/speedup-research-center-construction',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Invalidate Balance tag from balanceApi to ensure fresh balance data
          dispatch(balanceApi.util.invalidateTags(['Balance']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
      invalidatesTags: ['User'],
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
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(balanceApi.util.invalidateTags(['Balance']));
          const { rentalHousingApi } = await import('./rentalHousingApi');
          dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
      invalidatesTags: (result, error, propertyId) => [
        { type: 'User', id: `rentalHousingStatus-${propertyId}` }
      ],
    }),

    speedupPropertyConstruction: builder.mutation<SpeedupPropertyConstructionResponse, number>({
      query: (propertyId) => ({
        url: `/api/users/speedup-property-construction/${propertyId}`,
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(balanceApi.util.invalidateTags(['Balance']));
          const { rentalHousingApi } = await import('./rentalHousingApi');
          dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
        } catch {
          // Error handling is done by the mutation itself
        }
      },
      invalidatesTags: (result, error, propertyId) => [
        { type: 'User', id: `rentalHousingStatus-${propertyId}` }
      ],
    }),

    startRemodel: builder.mutation<StartRemodelResponse, StartRemodelRequest>({
      query: ({ propertyId, room }) => ({
        url: `/api/users/start-remodel/${propertyId}`,
        method: 'POST',
        body: { room },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(balanceApi.util.invalidateTags(['Balance']));
          const { rentalHousingApi } = await import('./rentalHousingApi');
          dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
        } catch {
          // no-op
        }
      },
      invalidatesTags: (result, error, { propertyId }) => [
        { type: 'User', id: `rentalHousingStatus-${propertyId}` }
      ],
    }),

    completeRemodel: builder.mutation<CompleteRemodelResponse, StartRemodelRequest>({
      query: ({ propertyId, room }) => ({
        url: `/api/users/complete-remodel/${propertyId}`,
        method: 'POST',
        body: { room },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(balanceApi.util.invalidateTags(['Balance']));
          const { rentalHousingApi } = await import('./rentalHousingApi');
          dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
        } catch {
          // no-op
        }
      },
      invalidatesTags: (result, error, { propertyId }) => [
        { type: 'User', id: `rentalHousingStatus-${propertyId}` }
      ],
    }),

    speedupRemodel: builder.mutation<SpeedupRemodelResponse, StartRemodelRequest>({
      query: ({ propertyId, room }) => ({
        url: `/api/users/speedup-remodel/${propertyId}`,
        method: 'POST',
        body: { room },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(balanceApi.util.invalidateTags(['Balance']));
          const { rentalHousingApi } = await import('./rentalHousingApi');
          dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
        } catch {
          // no-op
        }
      },
      invalidatesTags: (result, error, { propertyId }) => [
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

    linkAccount: builder.mutation<{ success: boolean; message: string }, { email: string; accessKey: string }>({
      query: (data) => ({
        url: '/api/auth/link-account',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    changePassword: builder.mutation<{ success: boolean; message: string }, { currentAccessKey: string; newAccessKey: string; verifyNewAccessKey: string }>({
      query: (data) => ({
        url: '/api/auth/change-password',
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
      providesTags: ['User', 'Crew'],
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

    getWarStatus: builder.query<{ success: boolean; isAtWar: boolean; warsWeDeclared: Array<{ enemyCrewId: string; enemyCrewName: string; enemyCrewIdentifier: string; warDeclaredAt: string | null }>; warsDeclaredOnUs: Array<{ enemyCrewId: string; enemyCrewName: string; enemyCrewIdentifier: string; warDeclaredAt: string | null }> }, void>({
      query: () => '/api/crew/war-status',
      providesTags: ['User', 'Crew'],
      refetchOnMountOrArgChange: true,
      keepUnusedDataFor: 0, // Don't keep unused data to ensure fresh data after mutations
    }),

    getWarManagementCrews: builder.query<{ success: boolean; crews: Array<{ id: string; crewName: string; crewIdentifier: string; memberCount: number; createdAt: string | null }> }, void>({
      query: () => '/api/crew/war-management/crews',
      providesTags: ['User', 'Crew'],
    }),

    declareWar: builder.mutation<{ success: boolean; message: string; warStatus: { enemyCrewId: string; enemyCrewName: string; enemyCrewIdentifier: string; warDeclaredAt: string | null } }, { targetCrewId: string }>({
      query: (data) => ({
        url: '/api/crew/war-management/declare',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Crew'],
    }),

    terminateWar: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/api/crew/war-management/terminate',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Crew'],
    }),

    getAllianceStatus: builder.query<{ success: boolean; alliances: Array<{ alliedCrewId: string; alliedCrewName: string; alliedCrewIdentifier: string }>; requestsWeSent: Array<{ requestedCrewId: string; requestedCrewName: string; requestedCrewIdentifier: string }>; requestsWeReceived: Array<{ requestingCrewId: string; requestingCrewName: string; requestingCrewIdentifier: string }> }, void>({
      query: () => '/api/crew/alliance-status',
      providesTags: ['User', 'Crew'],
      refetchOnMountOrArgChange: true,
      keepUnusedDataFor: 0,
    }),

    getAllianceManagementCrews: builder.query<{ success: boolean; crews: Array<{ id: string; crewName: string; crewIdentifier: string; memberCount: number; status: string; createdAt: string | null }> }, void>({
      query: () => '/api/crew/alliance-management/crews',
      providesTags: ['User', 'Crew'],
    }),

    requestAlliance: builder.mutation<{ success: boolean; message: string }, { targetCrewId: string }>({
      query: (data) => ({
        url: '/api/crew/alliance-management/request',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Crew'],
    }),

    acceptAlliance: builder.mutation<{ success: boolean; message: string; alliances: Array<{ alliedCrewId: string; alliedCrewName: string; alliedCrewIdentifier: string }> }, { targetCrewId: string }>({
      query: (data) => ({
        url: '/api/crew/alliance-management/accept',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Crew'],
    }),

    terminateAlliance: builder.mutation<{ success: boolean; message: string }, { targetCrewId: string }>({
      query: (data) => ({
        url: '/api/crew/alliance-management/terminate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Crew'],
    }),

    getCrewChatMessages: builder.query<{ success: boolean; messages: Array<{ id: string; userId: string; username: string; message: string; timestamp: string; isFromAdmin?: boolean }> }, string>({
      query: (crewId) => ({
        url: `/api/crew/chat-messages?crewId=${crewId}`,
        method: 'GET',
      }),
      providesTags: (result, error, crewId) => [{ type: 'CrewChat', id: crewId }],
      // Keep cached data longer to reduce refetches when component remounts
      keepUnusedDataFor: 30,
    }),

    sendCrewChatMessage: builder.mutation<{ success: boolean; message: { id: string; userId: string; username: string; message: string; timestamp: string; isFromAdmin?: boolean } }, { crewId: string; message: string }>({
      query: (data) => ({
        url: '/api/crew/chat-messages',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { crewId }) => [{ type: 'CrewChat', id: crewId }],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleSignInMutation,
  useGetProfileQuery,
  useGetUserProfileQuery,
  useLazyLookupUserByHandleQuery,
  useUnlockHackRigMutation,
  useUnlockResearchCenterMutation,
  useUnlockProgrammingFacilityMutation,
  useGetResearchCenterStatusQuery,
  useSpeedupResearchCenterConstructionMutation,
  useGetRentalHousingStatusQuery,
  useUnlockRentalHousingMutation,
  useCompleteRentalHousingMutation,
  useSpeedupPropertyConstructionMutation,
  useStartRemodelMutation,
  useCompleteRemodelMutation,
  useSpeedupRemodelMutation,
  useCompleteOnboardingMutation,
  useDeleteAccountMutation,
  useForgotPasswordMutation,
  useLinkAccountMutation,
  useChangePasswordMutation,
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
  useGetWarStatusQuery,
  useGetWarManagementCrewsQuery,
  useDeclareWarMutation,
  useTerminateWarMutation,
  useGetAllianceStatusQuery,
  useGetAllianceManagementCrewsQuery,
  useRequestAllianceMutation,
  useAcceptAllianceMutation,
  useTerminateAllianceMutation,
  useGetCrewChatMessagesQuery,
  useSendCrewChatMessageMutation,
} = authApi;
