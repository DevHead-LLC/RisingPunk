import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';

// Base API configuration
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      // Get token from Redux state
      const state = getState() as RootState;
      const token = state.auth?.token;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  endpoints: () => ({}),
  tagTypes: ['User', 'Balance', 'Bots', 'Battle', 'Map'],
});

// Error handling utilities
export const handleApiError = (error: any) => {
  if (error?.status === 401) {
    // Handle unauthorized - will dispatch logout in Phase 2
    console.warn('Unauthorized request');
  } else if (error?.status >= 500) {
    console.error('Server error:', error);
  } else if (error?.status >= 400) {
    console.warn('Client error:', error);
  } else {
    console.error('Network error:', error);
  }
  return error;
};

// Common query configurations
export const createQueryWithErrorHandling = <T>(queryFn: () => Promise<T>) => {
  return async () => {
    try {
      return await queryFn();
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };
};
