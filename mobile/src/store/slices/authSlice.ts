import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';
import { API_URL } from '../../config';
import { updateBalance } from './balanceSlice';
import { setBots, setBuildState } from './botsSlice';
import { resetAllApiCaches } from '../api/resetApiCaches';
import { authApi } from '../api/authApi';

// Types
export interface User {
  _id: string;
  handle: string;
  email: string;
  level: number;
  unlockedFeatures: {
    hackRig: boolean;
  };
  profileGender: 'male' | 'female';
  onboardingCompleted: boolean;
  needsHandleSelection: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationPrompted?: boolean;
  debugFeatures?: {
    enableDataRefresh: boolean;
    enableDebugLogs: boolean;
  };
  totalGuardiansBuilt?: number;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  showOnboarding: boolean;
  showTurfIntro: boolean;
  showHandleSelection: boolean;
  showEmailVerification: boolean;
  showEmailVerificationBanner: boolean;
  emailVerificationPromptedUserId: string | null; // Track which user has been prompted for email verification in this session
  isInitialized: boolean; // Track if initial database verification is complete
  showAccountSwitched: boolean; // Show modal when account is switched on another device
  showAccountSwitchedBanner: boolean; // Show banner notification when account is switched
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { handle: string; accessKey: string }, { rejectWithValue, dispatch }) => {
    try {
      console.log('🔵 LOGIN: Starting login request', {
        url: `${API_URL}/api/auth/login`,
        hasHandle: !!credentials.handle,
        apiUrl: API_URL,
      });
      
      // Test basic connectivity first
      console.log('🔵 LOGIN: Testing basic connectivity...');
      try {
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 5000);
        const connectivityTest = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          signal: healthController.signal,
        });
        clearTimeout(healthTimeout);
        console.log('🔵 LOGIN: Connectivity test result', {
          ok: connectivityTest.ok,
          status: connectivityTest.status,
        });
      } catch (connectivityError: any) {
        console.log('🔵 LOGIN: Connectivity test failed', {
          name: connectivityError?.name,
          message: connectivityError?.message,
        });
        // Continue anyway - health endpoint might not exist
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('🔵 LOGIN: Request timeout (10s) - aborting...');
        controller.abort();
      }, 10000);
      
      let response;
      try {
        const fetchStartTime = Date.now();
        console.log('🔵 LOGIN: Executing fetch...', {
          url: `${API_URL}/api/auth/login`,
          timestamp: fetchStartTime,
        });
        response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
          signal: controller.signal,
        });
        const fetchDuration = Date.now() - fetchStartTime;
        console.log('🔵 LOGIN: Fetch completed', {
          duration: `${fetchDuration}ms`,
          ok: response.ok,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        });
      } catch (fetchError: any) {
        console.log('🔵 LOGIN: Fetch error', {
          name: fetchError?.name,
          message: fetchError?.message,
          isAbortError: fetchError?.name === 'AbortError',
          stack: fetchError?.stack,
        });
        if (fetchError.name === 'AbortError') {
          return rejectWithValue('Request timeout: Server did not respond within 10 seconds');
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        
        // Handle specific error cases with user-friendly messages
        if (error.error && (error.error.includes('Google Sign-In') || error.error.includes('No password set') || error.error.includes('This account was created with Google Sign-In'))) {
          return rejectWithValue('Please Sign In with the Google account used to create this user.');
        }
        
        return rejectWithValue(error.error || 'Login failed');
      }

      const data = await response.json();

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Clear any existing RTK Query cache to ensure fresh data for new user
      resetAllApiCaches({ dispatch } as any);

      // Note: Preferences will be synced by AppContent useEffect after login completes

      // Fetch initial data after successful login
      try {
        // Balance fetching is handled by DataFetcher + RTK Query polling
        
        // Fetch bots
        const botsResponse = await fetch(`${API_URL}/api/bots`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (botsResponse.ok) {
          const botsData = await botsResponse.json();
          dispatch(setBots(botsData.bots));
        }

        // Fetch build state
        const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (buildStateResponse.ok) {
          const buildStateData = await buildStateResponse.json();
          dispatch(setBuildState(buildStateData));
        }
      } catch (fetchError) {
        // Don't fail login if data fetching fails
        console.warn('Failed to fetch initial data:', fetchError);
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      if (error instanceof TypeError) {
        if (error.message.includes('Network request failed') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('aborted')) {
          return rejectWithValue('Network error: Cannot connect to server');
        }
      }
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (typeof errorMessage === 'string' && (
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('aborted')
        )) {
          return rejectWithValue('Network error: Cannot connect to server');
        }
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: { email: string; accessKey: string }, { rejectWithValue }) => {
    try {
      // CRITICAL: Log the API URL being used for registration
      console.log('🔴 REGISTRATION API CALL:');
      console.log(`  - API_URL: ${API_URL}`);
      console.log(`  - Full URL: ${API_URL}/api/auth/register`);
      console.log(`  - Config.API_ENV: ${Config.API_ENV || 'undefined'}`);
      console.log(`  - Config.API_URL: ${Config.API_URL || 'undefined'}`);
      
      console.log('🔴 REGISTRATION: Creating AbortController for timeout...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('🔴 REGISTRATION: Request timeout (10s) - aborting...');
        controller.abort();
      }, 10000);
      
      console.log('🔴 REGISTRATION: Starting fetch request...', {
        url: `${API_URL}/api/auth/register`,
        method: 'POST',
        body: JSON.stringify(credentials),
        hasEmail: !!credentials.email,
        hasAccessKey: !!credentials.accessKey,
        apiUrl: API_URL,
      });
      
      // Test basic connectivity first
      console.log('🔴 REGISTRATION: Testing basic connectivity...');
      try {
        const healthController = new AbortController();
        const healthTimeout = setTimeout(() => healthController.abort(), 5000);
        const connectivityTest = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          signal: healthController.signal,
        });
        clearTimeout(healthTimeout);
        console.log('🔴 REGISTRATION: Connectivity test result', {
          ok: connectivityTest.ok,
          status: connectivityTest.status,
        });
      } catch (connectivityError: any) {
        console.log('🔴 REGISTRATION: Connectivity test failed', {
          name: connectivityError?.name,
          message: connectivityError?.message,
        });
        // Continue anyway - health endpoint might not exist
      }
      
      let response;
      try {
        const fetchStartTime = Date.now();
        console.log('🔴 REGISTRATION: Executing fetch...', {
          url: `${API_URL}/api/auth/register`,
          timestamp: fetchStartTime,
        });
        response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
          signal: controller.signal,
        });
        const fetchDuration = Date.now() - fetchStartTime;
        console.log('🔴 REGISTRATION: Fetch completed', {
          duration: `${fetchDuration}ms`,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });
      } catch (fetchError: any) {
        console.log('🔴 REGISTRATION: Fetch error caught', {
          name: fetchError?.name,
          message: fetchError?.message,
          isAbortError: fetchError?.name === 'AbortError',
          stack: fetchError?.stack,
        });
        if (fetchError.name === 'AbortError') {
          return rejectWithValue('Request timeout: Server did not respond within 10 seconds');
        }
        throw fetchError; // Re-throw to be caught by outer catch
      } finally {
        clearTimeout(timeoutId);
      }

      console.log('🔴 REGISTRATION: Response received', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        console.log('🔴 REGISTRATION: Response not OK, parsing error...');
        let error;
        try {
          error = await response.json();
          console.log('🔴 REGISTRATION: Error response parsed', error);
        } catch (parseError) {
          console.log('🔴 REGISTRATION: Failed to parse error response', parseError);
          error = { error: 'Registration failed' };
        }
        return rejectWithValue(error.error || 'Registration failed');
      }

      console.log('🔴 REGISTRATION: Response OK, parsing JSON...');
      let data;
      try {
        data = await response.json();
        console.log('🔴 REGISTRATION: Success - data received', {
          hasToken: !!data.token,
          hasUser: !!data.user,
          userHandle: data.user?.handle,
          userNeedsHandleSelection: data.user?.needsHandleSelection,
          userOnboardingCompleted: data.user?.onboardingCompleted,
        });
      } catch (parseError) {
        console.log('🔴 REGISTRATION: Failed to parse success response', parseError);
        return rejectWithValue('Invalid response from server');
      }

      // Store in AsyncStorage
      console.log('🔴 REGISTRATION: Storing token in AsyncStorage...');
      await AsyncStorage.setItem('token', data.token);
      console.log('🔴 REGISTRATION: Token stored');
      
      console.log('🔴 REGISTRATION: Storing user in AsyncStorage...');
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      console.log('🔴 REGISTRATION: User stored');

      console.log('🔴 REGISTRATION: Returning data to Redux...');
      return data;
    } catch (error) {
      console.log('🔴 REGISTRATION: Outer catch block - error occurred', {
        errorType: error?.constructor?.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        isTypeError: error instanceof TypeError,
        isAbortError: (error as any)?.name === 'AbortError',
      });
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.log('🔴 REGISTRATION: Network error detected');
        return rejectWithValue('Network error: Cannot connect to server');
      }
      if ((error as any)?.name === 'AbortError') {
        console.log('🔴 REGISTRATION: Abort error (timeout)');
        return rejectWithValue('Request timeout: Server did not respond');
      }
      console.log('🔴 REGISTRATION: Returning generic error');
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const googleSignInUser = createAsyncThunk(
  'auth/googleSignIn',
  async (idToken: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/google-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Google Sign-In failed' }));
        console.error('Google Sign-In server error:', error);
        
        // Handle specific error cases with user-friendly messages
        if (error.error && error.error.includes('No account found')) {
          return rejectWithValue('No account found with this Google account. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.');
        } else if (error.error && error.error.includes('account already exists with this Google account')) {
          return rejectWithValue('An account already exists with this Google account. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        } else if (error.error && error.error.includes('account already exists with this email address')) {
          return rejectWithValue('An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        }
        
        return rejectWithValue(error.error || 'Google Sign-In failed');
      }

      const data = await response.json();

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Clear any existing RTK Query cache to ensure fresh data for new user
      resetAllApiCaches({ dispatch } as any);

      // Fetch initial data after successful login
      try {
        // Balance fetching is handled by DataFetcher + RTK Query polling
        
        // Fetch bots
        const botsResponse = await fetch(`${API_URL}/api/bots`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (botsResponse.ok) {
          const botsData = await botsResponse.json();
          dispatch(setBots(botsData.bots));
        }

        // Fetch build state
        const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (buildStateResponse.ok) {
          const buildStateData = await buildStateResponse.json();
          dispatch(setBuildState(buildStateData));
        }
      } catch (fetchError) {
        // Don't fail login if data fetching fails
        console.warn('Failed to fetch initial data:', fetchError);
      }

      return data;
    } catch (error) {
      console.error('Google Sign-In error:', error);
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const googleSignUpUser = createAsyncThunk(
  'auth/googleSignUp',
  async (idToken: string, { rejectWithValue, dispatch }) => {
    try {
      // CRITICAL: Log the API URL being used for Google sign-up (development only)
      if (__DEV__) {
        console.log('🔴 GOOGLE SIGN-UP API CALL:');
        console.log(`  - API_URL: ${API_URL}`);
        console.log(`  - Full URL: ${API_URL}/api/auth/google-signup`);
        console.log(`  - Config.API_ENV: ${Config.API_ENV || 'undefined'}`);
        console.log(`  - Config.API_URL: ${Config.API_URL || 'undefined'}`);
      }
      
      const response = await fetch(`${API_URL}/api/auth/google-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Google Sign-Up failed' }));
        
        // Handle specific error cases with user-friendly messages
        if (error.error && error.error.includes('account already exists with this Google account')) {
          return rejectWithValue('An account already exists with this Google account. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        } else if (error.error && error.error.includes('account already exists with this email address')) {
          return rejectWithValue('An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        }
        
        return rejectWithValue(error.error || 'Google Sign-Up failed');
      }

      const data = await response.json();

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Clear any existing RTK Query cache to ensure fresh data for new user
      resetAllApiCaches({ dispatch } as any);

      // Fetch initial data after successful signup
      try {
        // Fetch balance
        const balanceResponse = await fetch(`${API_URL}/api/balance`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          dispatch(updateBalance({
            total: balanceData.total,
            ratePerSecond: balanceData.ratePerSecond,
            lastUpdated: new Date().toISOString(),
          }));
        }

        // Fetch bots
        const botsResponse = await fetch(`${API_URL}/api/bots`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (botsResponse.ok) {
          const botsData = await botsResponse.json();
          dispatch(setBots(botsData.bots));
        }

        // Fetch build state
        const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (buildStateResponse.ok) {
          const buildStateData = await buildStateResponse.json();
          dispatch(setBuildState(buildStateData));
        }
      } catch (fetchError) {
        // Silently handle fetch errors
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const appleSignInUser = createAsyncThunk(
  'auth/appleSignIn',
  async (idToken: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/apple-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Apple Sign-In failed' }));
        console.error('Apple Sign-In server error:', error);
        
        // Handle specific error cases with user-friendly messages
        if (error.error && error.error.includes('No account found')) {
          return rejectWithValue('No account found with this Apple ID. Please use the "NEW_IDENTITY (SIGN_UP)" option to create an account.');
        } else if (error.error && error.error.includes('account already exists with this Apple ID')) {
          return rejectWithValue('An account already exists with this Apple ID. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        } else if (error.error && error.error.includes('account already exists with this email address')) {
          return rejectWithValue('An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        }
        
        return rejectWithValue(error.error || 'Apple Sign-In failed');
      }

      const data = await response.json();

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Clear any existing RTK Query cache to ensure fresh data for new user
      resetAllApiCaches({ dispatch } as any);

      // Fetch initial data after successful login
      try {
        // Balance fetching is handled by DataFetcher + RTK Query polling
        
        // Fetch bots
        const botsResponse = await fetch(`${API_URL}/api/bots`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (botsResponse.ok) {
          const botsData = await botsResponse.json();
          dispatch(setBots(botsData.bots));
        }

        // Fetch build state
        const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (buildStateResponse.ok) {
          const buildStateData = await buildStateResponse.json();
          dispatch(setBuildState(buildStateData));
        }
      } catch (fetchError) {
        // Don't fail login if data fetching fails
        console.error('Failed to fetch initial data:', fetchError);
      }

      return data;
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const appleSignUpUser = createAsyncThunk(
  'auth/appleSignUp',
  async (idToken: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/apple-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Apple Sign-Up failed' }));
        
        // Handle specific error cases with user-friendly messages
        if (error.error && error.error.includes('account already exists with this Apple ID')) {
          return rejectWithValue('An account already exists with this Apple ID. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        } else if (error.error && error.error.includes('account already exists with this email address')) {
          return rejectWithValue('An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        }
        
        return rejectWithValue(error.error || 'Apple Sign-Up failed');
      }

      const data = await response.json();

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Clear any existing RTK Query cache to ensure fresh data for new user
      resetAllApiCaches({ dispatch } as any);

      // Fetch initial data after successful signup
      try {
        // Fetch balance
        const balanceResponse = await fetch(`${API_URL}/api/balance`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          dispatch(updateBalance({
            total: balanceData.total,
            ratePerSecond: balanceData.ratePerSecond,
            lastUpdated: new Date().toISOString(),
          }));
        }

        // Fetch bots
        const botsResponse = await fetch(`${API_URL}/api/bots`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (botsResponse.ok) {
          const botsData = await botsResponse.json();
          dispatch(setBots(botsData.bots));
        }

        // Fetch build state
        const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
          headers: {
            'Authorization': `Bearer ${data.token}`,
          },
        });

        if (buildStateResponse.ok) {
          const buildStateData = await buildStateResponse.json();
          dispatch(setBuildState(buildStateData));
        }
      } catch (fetchError) {
        // Silently handle fetch errors
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateUserHandle = createAsyncThunk(
  'auth/updateHandle',
  async (handle: string, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState() as { auth: AuthState };
      const token = state.auth.token;
      
      if (!token) {
        return rejectWithValue('No authentication token');
      }

      const response = await fetch(`${API_URL}/api/auth/update-handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ handle }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Handle update failed' }));
        throw new Error(error.error || 'Handle update failed');
      }

      const data = await response.json();
      
      // Update AsyncStorage with new user data
      try {
        const currentUserData = await AsyncStorage.getItem('user');
        if (currentUserData) {
          const userData = JSON.parse(currentUserData);
          userData.handle = data.user.handle;
          userData.needsHandleSelection = false;
          await AsyncStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (storageError) {
        console.error('Failed to update AsyncStorage:', storageError);
      }
      
      // Invalidate RTK Query cache to ensure profile data is refreshed
      dispatch(authApi.util.invalidateTags(['User']));
      
      return data;
    } catch (error: any) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const unlockHackRig = createAsyncThunk(
  'auth/unlockHackRig',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { token, user } = state.auth;

      if (!token || !user) {
        return rejectWithValue('No authentication token');
      }

      const response = await fetch(`${API_URL}/users/unlock-hack-rig`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return rejectWithValue('Failed to unlock hack rig');
      }

      const updatedUser = await response.json();

      // Update AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    resetAllApiCaches({ dispatch } as any);
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStored',
  async (_, { rejectWithValue }) => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      
      if (!storedToken) {
        return null;
      }

      // Verify token and get fresh user data from database
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      let response;
      try {
        response = await fetch(`${API_URL}/api/auth/verify-token`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${storedToken}`,
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        // Token is invalid, clear stored data
        await AsyncStorage.multiRemove(['token', 'user']);
        return null;
      }

      const userData = await response.json();
      
      // Update stored user data with fresh database data
      await AsyncStorage.setItem('user', JSON.stringify(userData.user));
      
      return {
        token: storedToken,
        user: userData.user,
      };
    } catch (error) {
      console.error('🔴 LOAD STORED AUTH: Error verifying token:', error);
      // On error (including network errors), clear stored data to force re-authentication
      await AsyncStorage.multiRemove(['token', 'user']);
      return null;
    }
  }
);

export const fetchInitialData = createAsyncThunk(
  'auth/fetchInitialData',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { token } = state.auth;

      if (!token) {
        return rejectWithValue('No authentication token');
      }

      // Fetch balance
      const balanceResponse = await fetch(`${API_URL}/api/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        dispatch(updateBalance({
          total: balanceData.total,
          ratePerSecond: balanceData.ratePerSecond,
          lastUpdated: new Date().toISOString(),
        }));
      }

      // Fetch bots
      const botsResponse = await fetch(`${API_URL}/api/bots`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (botsResponse.ok) {
        const botsData = await botsResponse.json();
        dispatch(setBots(botsData.bots));
      }

      // Fetch build state
      const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (buildStateResponse.ok) {
        const buildStateData = await buildStateResponse.json();
        dispatch(setBuildState(buildStateData));
      }

      return { success: true };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const refreshUserData = createAsyncThunk(
  'auth/refreshUserData',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { token } = state.auth;

      if (!token) {
        return rejectWithValue('No authentication token');
      }

      // Fetch updated user profile
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const userData = await response.json();
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return rejectWithValue('Failed to refresh user data');
    }
  }
);

export const forceRefreshAllData = createAsyncThunk(
  'auth/forceRefreshAllData',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { token } = state.auth;

      if (!token) {
        return rejectWithValue('No authentication token');
      }


      // Clear all RTK Query caches to force fresh data
      resetAllApiCaches({ dispatch } as any);

      // Fetch fresh data
      const balanceResponse = await fetch(`${API_URL}/api/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        dispatch(updateBalance({
          total: balanceData.total,
          ratePerSecond: balanceData.ratePerSecond,
          lastUpdated: new Date().toISOString(),
        }));
      }

      const botsResponse = await fetch(`${API_URL}/api/bots`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (botsResponse.ok) {
        const botsData = await botsResponse.json();
        dispatch(setBots(botsData.bots));
      }

      const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (buildStateResponse.ok) {
        const buildStateData = await buildStateResponse.json();
        dispatch(setBuildState(buildStateData));
      }

      return { success: true };
    } catch (error) {
      console.error('Error during data refresh:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Initial state
const initialState: AuthState = {
  token: null,
  user: null,
  isLoading: true,
  error: null,
  showOnboarding: false,
  showTurfIntro: false,
  showHandleSelection: false,
  showEmailVerification: false,
  showEmailVerificationBanner: false,
  emailVerificationPromptedUserId: null,
  isInitialized: false,
  showAccountSwitched: false,
  showAccountSwitchedBanner: false,
};

// Slice
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCredentials: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
    },
    setOnboardingCompleted: (state) => {
      // Only allow onboarding completion if app is initialized
      if (!state.isInitialized) {
        return;
      }
      
      // Store the current handle selection state before making changes
      const shouldShowHandleSelection = state.showHandleSelection;
      
      state.showOnboarding = false;
      state.showTurfIntro = true;
      // Explicitly preserve handle selection state
      state.showHandleSelection = shouldShowHandleSelection;
      
      if (state.user) {
        state.user.onboardingCompleted = true;
      }
    },
    setShowOnboarding: (state, action: PayloadAction<boolean>) => {
      state.showOnboarding = action.payload;
    },
    setShowTurfIntro: (state, action: PayloadAction<boolean>) => {
      // Only allow turf intro changes if app is initialized
      if (!state.isInitialized) {
        return;
      }
      
      // If we're hiding turf intro (setting to false), check if user needs handle selection
      if (action.payload === false) {
        // Check if user needs handle selection and set it to true
        if (state.user && state.user.needsHandleSelection) {
          state.showHandleSelection = true;
        }
      }
      
      state.showTurfIntro = action.payload;
    },
    setShowHandleSelection: (state, action: PayloadAction<boolean>) => {
      state.showHandleSelection = action.payload;
    },
    setShowEmailVerification: (state, action: PayloadAction<boolean>) => {
      state.showEmailVerification = action.payload;
    },
    setShowEmailVerificationBanner: (state, action: PayloadAction<boolean>) => {
      state.showEmailVerificationBanner = action.payload;
    },
    setEmailVerificationPrompted: (state, action: PayloadAction<string | null>) => {
      state.emailVerificationPromptedUserId = action.payload;
    },
    forceRefreshData: (state) => {
      // This action will trigger a complete data refresh
    },
    setShowAccountSwitched: (state, action: PayloadAction<boolean>) => {
      state.showAccountSwitched = action.payload;
    },
    setShowAccountSwitchedBanner: (state, action: PayloadAction<boolean>) => {
      state.showAccountSwitchedBanner = action.payload;
    },
    handleAccountSwitched: (state, action) => {
      // Prevent multiple calls - if already logged out, don't process again
      if (!state.token) {
        return;
      }
      
      // Only show banner if user was actually authenticated (old user being logged out)
      const wasAuthenticated = !!state.token;
      
      // Clear all auth data
      state.token = null;
      state.user = null;
      state.isLoading = false;
      state.error = null;
      state.showOnboarding = false;
      state.showTurfIntro = false;
      state.showHandleSelection = false;
      state.showEmailVerification = false;
      state.showEmailVerificationBanner = false;
      state.emailVerificationPromptedUserId = null;
      state.isInitialized = false;
      state.showAccountSwitched = false; // Don't show modal
      
      // Only show banner if user was authenticated (old user being logged out)
      state.showAccountSwitchedBanner = wasAuthenticated;
      
      // Note: RTK Query cache clearing will be handled by the API error handlers
      // that dispatch this action, to avoid circular dependencies
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
          .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        state.showOnboarding = !action.payload.user.onboardingCompleted;
        state.showHandleSelection = action.payload.user.needsHandleSelection;
        state.showEmailVerification = false;
        state.showEmailVerificationBanner = false;
        state.isInitialized = true; // Mark as initialized after successful login
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.token = null;
        state.user = null;
        state.isInitialized = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        console.log('🔴 REGISTRATION REDUCER: Pending - setting isLoading=true');
        state.isLoading = true;
        state.error = null;
      })
          .addCase(registerUser.fulfilled, (state, action) => {
      console.log('🔴 REGISTRATION REDUCER: Fulfilled - updating state', {
        hasToken: !!action.payload.token,
        hasUser: !!action.payload.user,
        userHandle: action.payload.user?.handle,
        needsHandleSelection: action.payload.user?.needsHandleSelection,
        onboardingCompleted: action.payload.user?.onboardingCompleted,
      });
      state.isLoading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      state.showOnboarding = !action.payload.user.onboardingCompleted;
      state.showHandleSelection = action.payload.user.needsHandleSelection;
      state.isInitialized = true; // Mark as initialized after successful registration
      console.log('🔴 REGISTRATION REDUCER: State updated', {
        isLoading: state.isLoading,
        hasToken: !!state.token,
        hasUser: !!state.user,
        showOnboarding: state.showOnboarding,
        showHandleSelection: state.showHandleSelection,
        isInitialized: state.isInitialized,
      });
    })
      .addCase(registerUser.rejected, (state, action) => {
        console.log('🔴 REGISTRATION REDUCER: Rejected', {
          error: action.payload,
        });
        state.isLoading = false;
        state.error = action.payload as string;
        state.token = null;
        state.user = null;
        state.isInitialized = false;
      });

    // Google Sign-In
    builder
      .addCase(googleSignInUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleSignInUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        state.showOnboarding = !action.payload.user.onboardingCompleted;
        state.showHandleSelection = action.payload.user.needsHandleSelection;
        state.showEmailVerification = false;
        state.showEmailVerificationBanner = false;
        state.isInitialized = true; // Mark as initialized after successful Google Sign-In
      })
      .addCase(googleSignInUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

        // Google Sign-Up
    builder
      .addCase(googleSignUpUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
          .addCase(googleSignUpUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      state.showOnboarding = !action.payload.user.onboardingCompleted;
      // Store needsHandleSelection but don't show modal yet - wait for onboarding + turf intro to complete
      state.showHandleSelection = false; // Will be set to true after turf intro completes
      state.showEmailVerification = false;
      state.showEmailVerificationBanner = false;
      state.isInitialized = true; // Mark as initialized after successful Google Sign-Up
    })
      .addCase(googleSignUpUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Apple Sign-In
    builder
      .addCase(appleSignInUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(appleSignInUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        state.showOnboarding = !action.payload.user.onboardingCompleted;
        state.showHandleSelection = action.payload.user.needsHandleSelection;
        state.showEmailVerification = false;
        state.showEmailVerificationBanner = false;
        state.isInitialized = true; // Mark as initialized after successful Apple Sign-In
      })
      .addCase(appleSignInUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Apple Sign-Up
    builder
      .addCase(appleSignUpUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(appleSignUpUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        state.showOnboarding = !action.payload.user.onboardingCompleted;
        // Store needsHandleSelection but don't show modal yet - wait for onboarding + turf intro to complete
        state.showHandleSelection = false; // Will be set to true after turf intro completes
        state.showEmailVerification = false;
        state.showEmailVerificationBanner = false;
        state.isInitialized = true; // Mark as initialized after successful Apple Sign-Up
      })
      .addCase(appleSignUpUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Handle
    builder
      .addCase(updateUserHandle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserHandle.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          state.user.handle = action.payload.user.handle;
          state.user.needsHandleSelection = false;
        }
        state.showHandleSelection = false;
        // Show email verification modal after handle selection if email is not verified
        if (state.user && !state.user.emailVerified) {
          state.showEmailVerification = true;
        }
        state.error = null;
      })
      .addCase(updateUserHandle.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Unlock Hack Rig
    builder
      .addCase(unlockHackRig.pending, (state) => {
        state.error = null;
      })
      .addCase(unlockHackRig.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(unlockHackRig.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Logout
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.error = null;
        state.isLoading = false;
        state.showOnboarding = false;
        state.showTurfIntro = false;
        state.showHandleSelection = false;
        state.showEmailVerification = false;
        state.showEmailVerificationBanner = false;
        state.emailVerificationPromptedUserId = null;
        state.isInitialized = false;
      });

    // Load Stored Auth
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          const { token, user } = action.payload;
          
          state.token = token;
          state.user = user;
          
          // Set UI states based on fresh database data
          state.showOnboarding = !user.onboardingCompleted;
          state.showTurfIntro = false; // Always start with false, will be set by onboarding flow if needed
          state.showHandleSelection = user.needsHandleSelection && user.onboardingCompleted;
          state.isInitialized = true; // Mark that initial database verification is complete
          
          // Force fetch fresh balance and bot data immediately after auth
        } else {
          // No stored auth, reset all states
          state.token = null;
          state.user = null;
          state.showOnboarding = false;
          state.showTurfIntro = false;
          state.showHandleSelection = false;
          state.isInitialized = false;
        }
      })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isLoading = false;
        // On error, reset all states
        state.token = null;
        state.user = null;
        state.showOnboarding = false;
        state.showTurfIntro = false;
        state.showHandleSelection = false;
        state.isInitialized = false;
      });

    // Fetch Initial Data
    builder
      .addCase(fetchInitialData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInitialData.fulfilled, (state, _action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchInitialData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Refresh User Data
    builder
      .addCase(refreshUserData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(refreshUserData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        if (state.user && action.payload) {
          // Update user data with fresh data from server
          state.user.emailVerified = action.payload.emailVerified || false;
          state.user.handle = action.payload.handle;
          state.user.level = action.payload.level;
          state.user.unlockedFeatures = action.payload.unlockedFeatures;
          state.user.profileGender = action.payload.profileGender;
          state.user.onboardingCompleted = action.payload.onboardingCompleted;
          state.user.needsHandleSelection = action.payload.needsHandleSelection;
          state.user.totalGuardiansBuilt = action.payload.totalGuardiansBuilt || 0;
          
          // Reset email verification prompted flag if email is now verified
          if (action.payload.emailVerified) {
            state.emailVerificationPromptedUserId = null;
          }
        }
      })
      .addCase(refreshUserData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Force Refresh All Data
    builder
      .addCase(forceRefreshAllData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forceRefreshAllData.fulfilled, (state, _action) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(forceRefreshAllData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.error('Data refresh failed:', action.payload);
      });
  },
});

export const { clearError, setCredentials, setOnboardingCompleted, setShowOnboarding, setShowTurfIntro, setShowHandleSelection, setShowEmailVerification, setShowEmailVerificationBanner, setEmailVerificationPrompted, forceRefreshData, setShowAccountSwitched, setShowAccountSwitchedBanner, handleAccountSwitched } = authSlice.actions;
export const logout = logoutUser;
export const googleSignIn = googleSignInUser;
export const googleSignUp = googleSignUpUser;
export const appleSignIn = appleSignInUser;
export const appleSignUp = appleSignUpUser;
export const updateHandle = updateUserHandle;
export const forceRefresh = forceRefreshAllData;
export default authSlice.reducer;
