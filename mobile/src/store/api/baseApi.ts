import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_URL } from '../../config';
import type { RootState } from '../index';
import { getDeviceId } from '../../utils/deviceId';
import { globalErrorHandler } from '../../services/GlobalErrorHandler';

// Debounce mechanism for ACCOUNT_SWITCHED errors
let accountSwitchedDispatched = false;
let accountSwitchedTimeout: NodeJS.Timeout | null = null;

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

      // Device ID no longer needed for simple token invalidation approach

      headers.set('Content-Type', 'application/json');
      return headers;
    },
  })(args, api, extraOptions);

  if (result.error) {
    console.log('🔍 BASE API: Error received:', {
      status: result.error?.status,
      data: result.error?.data,
      error: result.error?.data?.error
    });
    
    // Check for account switched error first
    if (result.error?.status === 401 && result.error?.data?.error === 'ACCOUNT_SWITCHED') {
      console.log('🔍 BASE API: ACCOUNT_SWITCHED detected, checking debounce');
      
      // Debounce multiple ACCOUNT_SWITCHED errors
      if (!accountSwitchedDispatched) {
        console.log('🔍 BASE API: First ACCOUNT_SWITCHED error, dispatching action');
        accountSwitchedDispatched = true;
        api.dispatch({ type: 'auth/handleAccountSwitched' });
        
        // Reset flag after 2 seconds to allow future account switches
        if (accountSwitchedTimeout) {
          clearTimeout(accountSwitchedTimeout);
        }
        accountSwitchedTimeout = setTimeout(() => {
          accountSwitchedDispatched = false;
          console.log('🔍 BASE API: Account switched debounce reset');
        }, 2000);
      } else {
        console.log('🔍 BASE API: ACCOUNT_SWITCHED already dispatched, skipping');
      }
      
      return result; // Return early to prevent other error handling
    } else {
      console.log('🔍 BASE API: Not ACCOUNT_SWITCHED, calling handleApiError');
      handleApiError(result.error);
    }
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
