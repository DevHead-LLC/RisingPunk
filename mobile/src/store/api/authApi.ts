import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

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
  };
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:5001',
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
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetProfileQuery,
  useUnlockHackRigMutation,
} = authApi;
