import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { updateBalance } from './balanceSlice';
import { setBots, setBuildState } from './botsSlice';
import { authApi } from '../api/authApi';
import { balanceApi } from '../api/balanceApi';
import { botsApi } from '../api/botsApi';
import { mapApi } from '../api/mapApi';
import { getDeviceId } from '../../utils/deviceId';

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
      const deviceId = await getDeviceId();
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify(credentials),
      });

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
      dispatch(authApi.util.resetApiState());
      dispatch(balanceApi.util.resetApiState());
      dispatch(botsApi.util.resetApiState());
      dispatch(mapApi.util.resetApiState());

      // Note: Preferences will be synced by AppContent useEffect after login completes

      // Fetch initial data after successful login
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
        // Don't fail login if data fetching fails
        console.warn('Failed to fetch initial data:', fetchError);
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

export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: { email: string; accessKey: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Registration failed' }));
        return rejectWithValue(error.error || 'Registration failed');
      }

      const data = await response.json();
      console.log('🔵 CLIENT: Received registration response:', data);
      console.log('🔵 CLIENT: User needsHandleSelection:', data.user.needsHandleSelection);

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const googleSignInUser = createAsyncThunk(
  'auth/googleSignIn',
  async (idToken: string, { rejectWithValue, dispatch }) => {
    console.log('🔵 GSI Redux: Starting Google Sign-In thunk');
    console.log('🔵 GSI Redux: API URL:', API_URL);
    console.log('🔵 GSI Redux: ID Token length:', idToken?.length);
    
    try {
      console.log('🔵 GSI Redux: Making fetch request to server');
      const response = await fetch(`${API_URL}/api/auth/google-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
      
      console.log('🔵 GSI Redux: Server response received');
      console.log('🔵 GSI Redux: Response status:', response.status);
      console.log('🔵 GSI Redux: Response ok:', response.ok);

      if (!response.ok) {
        console.log('🔴 GSI Redux: Server response not ok, parsing error');
        const error = await response.json().catch(() => ({ error: 'Google Sign-In failed' }));
        console.log('🔴 GSI Redux: Server error:', error);
        
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

      console.log('🔵 GSI Redux: Parsing successful response');
      const data = await response.json();
      console.log('🔵 GSI Redux: Response data parsed successfully');

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Clear any existing RTK Query cache to ensure fresh data for new user
      dispatch(authApi.util.resetApiState());
      dispatch(balanceApi.util.resetApiState());
      dispatch(botsApi.util.resetApiState());
      dispatch(mapApi.util.resetApiState());

      // Fetch initial data after successful login
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
        // Don't fail login if data fetching fails
        console.warn('Failed to fetch initial data:', fetchError);
      }

      console.log('🔵 GSI Redux: Returning successful data');
      return data;
    } catch (error) {
      console.log('🔴 GSI Redux: Error caught in thunk');
      console.log('🔴 GSI Redux: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: typeof error,
        isTypeError: error instanceof TypeError,
        isNetworkError: error instanceof TypeError && error.message.includes('Network request failed'),
      });
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.log('🔴 GSI Redux: Network request failed error detected');
        return rejectWithValue('Network error: Cannot connect to server');
      }
      console.log('🔴 GSI Redux: Other error, rejecting with message');
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const googleSignUpUser = createAsyncThunk(
  'auth/googleSignUp',
  async (idToken: string, { rejectWithValue, dispatch }) => {
    try {
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
      dispatch(authApi.util.resetApiState());
      dispatch(balanceApi.util.resetApiState());
      dispatch(botsApi.util.resetApiState());
      dispatch(mapApi.util.resetApiState());

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
      
      console.log('🔵 HANDLE UPDATE: Handle updated successfully, invalidating User cache');
      
      // Update AsyncStorage with new user data
      try {
        const currentUserData = await AsyncStorage.getItem('user');
        if (currentUserData) {
          const userData = JSON.parse(currentUserData);
          userData.handle = data.user.handle;
          userData.needsHandleSelection = false;
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          console.log('🔵 HANDLE UPDATE: AsyncStorage updated with new handle:', data.user.handle);
        }
      } catch (storageError) {
        console.warn('🔵 HANDLE UPDATE: Failed to update AsyncStorage:', storageError);
      }
      
      // Invalidate RTK Query cache to ensure profile data is refreshed
      dispatch(authApi.util.invalidateTags(['User']));
      console.log('🔵 HANDLE UPDATE: User cache invalidated, profile should refresh');
      
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
    
    // Clear RTK Query cache to prevent data leakage between users
    // Using proper RTK Query utility methods to avoid serializable warnings
    dispatch(authApi.util.resetApiState());
    dispatch(balanceApi.util.resetApiState());
    dispatch(botsApi.util.resetApiState());
    dispatch(mapApi.util.resetApiState());
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
      const response = await fetch(`${API_URL}/api/auth/verify-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
        },
      });

      if (!response.ok) {
        // Token is invalid, clear stored data
        await AsyncStorage.multiRemove(['token', 'user']);
        return null;
      }

      const userData = await response.json();
      
      console.log('🔵 LOAD STORED AUTH: Raw response from verify-token:', userData);
      console.log('🔵 LOAD STORED AUTH: User data from database:', userData.user);
      
      // Update stored user data with fresh database data
      await AsyncStorage.setItem('user', JSON.stringify(userData.user));
      
      return {
        token: storedToken,
        user: userData.user,
      };
    } catch (error) {
      console.error('🔴 LOAD STORED AUTH: Error verifying token:', error);
      // On error, clear stored data to force re-authentication
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

      console.log('🔵 FORCE REFRESH: Starting complete data refresh from database');

      // Clear all RTK Query caches to force fresh data
      dispatch(authApi.util.resetApiState());
      dispatch(balanceApi.util.resetApiState());
      dispatch(botsApi.util.resetApiState());
      dispatch(mapApi.util.resetApiState());

      // Fetch fresh data
      const balanceResponse = await fetch(`${API_URL}/api/balance`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        console.log('🔵 FORCE REFRESH: Fresh balance data:', balanceData);
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
        console.log('🔵 FORCE REFRESH: Fresh bots data:', botsData);
        dispatch(setBots(botsData.bots));
      }

      const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (buildStateResponse.ok) {
        const buildStateData = await buildStateResponse.json();
        console.log('🔵 FORCE REFRESH: Fresh build state data:', buildStateData);
        dispatch(setBuildState(buildStateData));
      }

      console.log('🔵 FORCE REFRESH: Complete data refresh completed');
      return { success: true };
    } catch (error) {
      console.error('🔴 FORCE REFRESH: Error during data refresh:', error);
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
        console.log('🔵 ONB: Skipping onboarding completion - app not yet initialized');
        return;
      }
      
      console.log('🔵 ONB: Onboarding completed, current showHandleSelection:', state.showHandleSelection);
      // Store the current handle selection state before making changes
      const shouldShowHandleSelection = state.showHandleSelection;
      
      state.showOnboarding = false;
      state.showTurfIntro = true;
      // Explicitly preserve handle selection state
      state.showHandleSelection = shouldShowHandleSelection;
      
      if (state.user) {
        state.user.onboardingCompleted = true;
      }
      console.log('🔵 ONB: After update - showOnboarding:', state.showOnboarding, 'showTurfIntro:', state.showTurfIntro, 'showHandleSelection:', state.showHandleSelection);
    },
    setShowOnboarding: (state, action: PayloadAction<boolean>) => {
      state.showOnboarding = action.payload;
    },
    setShowTurfIntro: (state, action: PayloadAction<boolean>) => {
      // Only allow turf intro changes if app is initialized
      if (!state.isInitialized) {
        console.log('🔵 TURF: Skipping turf intro change - app not yet initialized');
        return;
      }
      
      console.log('🔵 TURF: Setting showTurfIntro to:', action.payload, 'current showHandleSelection:', state.showHandleSelection);
      
      // If we're hiding turf intro (setting to false), check if user needs handle selection
      if (action.payload === false) {
        // Check if user needs handle selection and set it to true
        if (state.user && state.user.needsHandleSelection) {
          state.showHandleSelection = true;
          console.log('🔵 TURF: Hiding turf intro, user needs handle selection, setting showHandleSelection: true');
        } else {
          console.log('🔵 TURF: Hiding turf intro, user does not need handle selection');
        }
      }
      
      state.showTurfIntro = action.payload;
      console.log('🔵 TURF: After update - showTurfIntro:', state.showTurfIntro, 'showHandleSelection:', state.showHandleSelection);
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
      console.log('🔵 FORCE REFRESH: Triggering complete data refresh from database');
    },
    setShowAccountSwitched: (state, action: PayloadAction<boolean>) => {
      state.showAccountSwitched = action.payload;
    },
    setShowAccountSwitchedBanner: (state, action: PayloadAction<boolean>) => {
      state.showAccountSwitchedBanner = action.payload;
    },
    handleAccountSwitched: (state, action) => {
      console.log('🔍 AUTH SLICE: handleAccountSwitched action dispatched');
      
      // Prevent multiple calls - if already logged out, don't process again
      if (!state.token) {
        console.log('🔍 AUTH SLICE: User already logged out, skipping handleAccountSwitched');
        return;
      }
      
      // Only show banner if user was actually authenticated (old user being logged out)
      const wasAuthenticated = !!state.token;
      console.log('🔍 AUTH SLICE: User was authenticated:', wasAuthenticated);
      
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
      console.log('🔍 AUTH SLICE: showAccountSwitchedBanner set to:', wasAuthenticated);
      
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
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
          .addCase(registerUser.fulfilled, (state, action) => {
      console.log('🔵 REG: Registration fulfilled, payload:', action.payload);
      console.log('🔵 REG: User needsHandleSelection:', action.payload.user.needsHandleSelection);
      console.log('🔵 REG: User onboardingCompleted:', action.payload.user.onboardingCompleted);
      
      state.isLoading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      state.showOnboarding = !action.payload.user.onboardingCompleted;
      state.showHandleSelection = action.payload.user.needsHandleSelection;
      state.isInitialized = true; // Mark as initialized after successful registration
      
      console.log('🔵 REG: State after update - showOnboarding:', state.showOnboarding, 'showHandleSelection:', state.showHandleSelection, 'isInitialized:', state.isInitialized);
    })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
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

    // Update Handle
    builder
      .addCase(updateUserHandle.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserHandle.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user) {
          console.log('🔵 AUTH SLICE: Updating local user handle from', state.user.handle, 'to', action.payload.user.handle);
          state.user.handle = action.payload.user.handle;
          state.user.needsHandleSelection = false;
        }
        state.showHandleSelection = false;
        // Show email verification modal after handle selection if email is not verified
        if (state.user && !state.user.emailVerified) {
          state.showEmailVerification = true;
          console.log('🔵 AUTH SLICE: Handle update completed, showing email verification modal');
        } else {
          console.log('🔵 AUTH SLICE: Handle update completed, email already verified');
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
          
          console.log('🔵 LOAD STORED AUTH: Loading fresh user data from database:', {
            handle: user.handle,
            onboardingCompleted: user.onboardingCompleted,
            needsHandleSelection: user.needsHandleSelection
          });
          
          state.token = token;
          state.user = user;
          
          // Set UI states based on fresh database data
          state.showOnboarding = !user.onboardingCompleted;
          state.showTurfIntro = false; // Always start with false, will be set by onboarding flow if needed
          state.showHandleSelection = user.needsHandleSelection && user.onboardingCompleted;
          state.isInitialized = true; // Mark that initial database verification is complete
          
          console.log('🔵 LOAD STORED AUTH: UI states set:', {
            showOnboarding: state.showOnboarding,
            showTurfIntro: state.showTurfIntro,
            showHandleSelection: state.showHandleSelection,
            isInitialized: state.isInitialized
          });
          
          // Force fetch fresh balance and bot data immediately after auth
          console.log('🔵 LOAD STORED AUTH: Triggering immediate data refresh');
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
          
          // Reset email verification prompted flag if email is now verified
          if (action.payload.emailVerified) {
            state.emailVerificationPromptedUserId = null;
          }
          
          console.log('🔵 AUTH SLICE: User data refreshed, emailVerified:', action.payload.emailVerified);
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
        console.log('🔵 FORCE REFRESH: Data refresh completed successfully');
      })
      .addCase(forceRefreshAllData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        console.error('🔴 FORCE REFRESH: Data refresh failed:', action.payload);
      });
  },
});

export const { clearError, setCredentials, setOnboardingCompleted, setShowOnboarding, setShowTurfIntro, setShowHandleSelection, setShowEmailVerification, setShowEmailVerificationBanner, setEmailVerificationPrompted, forceRefreshData, setShowAccountSwitched, setShowAccountSwitchedBanner, handleAccountSwitched } = authSlice.actions;
export const logout = logoutUser;
export const googleSignIn = googleSignInUser;
export const googleSignUp = googleSignUpUser;
export const updateHandle = updateUserHandle;
export const forceRefresh = forceRefreshAllData;
export default authSlice.reducer;
