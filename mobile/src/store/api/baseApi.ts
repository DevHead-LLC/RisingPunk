import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { getDeviceId } from '../../utils/deviceId';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';

// Custom base query with global error handling
const baseQueryWithErrorHandling = async (args: any, api: any, extraOptions: any) => {
  const result = await fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: async (headers, { getState }) => {
      // Get token from Redux state
      const state = getState() as RootState;
      const token = state.auth?.token;

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      // Add device ID for privacy policy compliance
      try {
        const deviceId = await getDeviceId();
        headers.set('x-device-id', deviceId);
      } catch (error) {
        console.error('❌ Failed to get device ID for headers:', error);
      }

      headers.set('Content-Type', 'application/json');
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    handleApiError(result.error);
  }

  return result;
};

// Base API configuration
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithErrorHandling,
  endpoints: () => ({}),
  tagTypes: ['User', 'Balance', 'Bots', 'Battle', 'Map'],
});

// Error handling utilities
export const handleApiError = (error: any) => {
  if (error?.status === 401) {
    console.warn('Unauthorized request');
    globalErrorHandler.handleDatabaseError(error);
  } else if (error?.status >= 500) {
    console.error('Server error:', error);
    globalErrorHandler.handleDatabaseError(error);
  } else if (error?.status >= 400) {
    console.warn('Client error:', error);
  } else {
    console.error('Network error:', error);
    globalErrorHandler.handleDatabaseError(error);
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
