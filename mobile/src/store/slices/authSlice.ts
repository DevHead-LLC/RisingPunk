import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { updateBalance } from './balanceSlice';
import { setBots, setBuildState } from './botsSlice';
import { authApi } from '../api/authApi';
import { balanceApi } from '../api/balanceApi';
import { botsApi } from '../api/botsApi';
import { mapApi } from '../api/mapApi';

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
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  showOnboarding: boolean;
  showUsernameSelection: boolean;
  showTurfIntro: boolean;
  showHandleSelection: boolean;
}

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { handle: string; accessKey: string }, { rejectWithValue, dispatch }) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
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
  async (credentials: { email: string; handle: string; accessKey: string }, { rejectWithValue }) => {
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
    console.log('🔵 GSU Redux: Starting Google Sign-Up thunk');
    console.log('🔵 GSU Redux: API URL:', API_URL);
    console.log('🔵 GSU Redux: ID Token length:', idToken?.length);
    
    try {
      console.log('🔵 GSU Redux: Making fetch request to server');
      const response = await fetch(`${API_URL}/api/auth/google-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });
      
      console.log('🔵 GSU Redux: Server response received');
      console.log('🔵 GSU Redux: Response status:', response.status);
      console.log('🔵 GSU Redux: Response ok:', response.ok);

      if (!response.ok) {
        console.log('🔴 GSU Redux: Server response not ok, parsing error');
        const error = await response.json().catch(() => ({ error: 'Google Sign-Up failed' }));
        console.log('🔴 GSU Redux: Server error:', error);
        
        // Handle specific error cases with user-friendly messages
        if (error.error && error.error.includes('account already exists with this Google account')) {
          return rejectWithValue('An account already exists with this Google account. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        } else if (error.error && error.error.includes('account already exists with this email address')) {
          return rejectWithValue('An account already exists with this email address. Please use the "EXISTING_IDENTITY (SIGN_IN)" option to sign in.');
        }
        
        return rejectWithValue(error.error || 'Google Sign-Up failed');
      }

      console.log('🔵 GSU Redux: Parsing successful response');
      const data = await response.json();
      console.log('🔵 GSU Redux: Response data parsed successfully');

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
        console.log('🔴 GSU Redux: Error fetching initial data:', fetchError);
      }

      console.log('🔵 GSU Redux: Google Sign-Up completed successfully');
      return data;
    } catch (error) {
      console.log('🔴 GSU Redux: Google Sign-Up failed:', error);
      console.log('🔴 GSU Redux: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: typeof error,
        isTypeError: error instanceof TypeError,
        isNetworkError: error instanceof TypeError && error.message.includes('Network request failed'),
      });
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.log('🔴 GSU Redux: Network request failed error detected');
        return rejectWithValue('Network error: Cannot connect to server');
      }
      console.log('🔴 GSU Redux: Other error, rejecting with message');
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const updateUserHandle = createAsyncThunk(
  'auth/updateHandle',
  async (handle: string, { rejectWithValue, getState }) => {
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
  async () => {
    const [storedToken, storedUser] = await Promise.all([
      AsyncStorage.getItem('token'),
      AsyncStorage.getItem('user'),
    ]);

    if (storedToken && storedUser) {
      const user = JSON.parse(storedUser) as User;
      
      return {
        token: storedToken,
        user: user,
      };
    }

    return null;
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

// Initial state
const initialState: AuthState = {
  token: null,
  user: null,
  isLoading: true,
  error: null,
  showOnboarding: false,
  showUsernameSelection: false,
  showTurfIntro: false,
  showHandleSelection: false,
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
      state.showOnboarding = false;
      state.showTurfIntro = true;
      if (state.user) {
        state.user.onboardingCompleted = true;
      }
    },
    setShowOnboarding: (state, action: PayloadAction<boolean>) => {
      state.showOnboarding = action.payload;
    },
    setShowTurfIntro: (state, action: PayloadAction<boolean>) => {
      state.showTurfIntro = action.payload;
    },
    setShowHandleSelection: (state, action: PayloadAction<boolean>) => {
      state.showHandleSelection = action.payload;
    },
    setShowUsernameSelection: (state, action: PayloadAction<boolean>) => {
      state.showUsernameSelection = action.payload;
    },
    setUsernameSelectionCompleted: (state) => {
      state.showUsernameSelection = false;
      state.showTurfIntro = true;
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
      state.isLoading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      state.showOnboarding = !action.payload.user.onboardingCompleted;
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
        state.showHandleSelection = action.payload.user.needsHandleSelection;
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
          state.user.handle = action.payload.user.handle;
          state.user.needsHandleSelection = false;
        }
        state.showHandleSelection = false;
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
      });

    // Load Stored Auth
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.isLoading = true;
      })
          .addCase(loadStoredAuth.fulfilled, (state, action) => {
      state.isLoading = false;
      if (action.payload) {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.showOnboarding = !action.payload.user.onboardingCompleted;
      }
    })
      .addCase(loadStoredAuth.rejected, (state) => {
        state.isLoading = false;
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
  },
});

export const { clearError, setCredentials, setOnboardingCompleted, setShowOnboarding, setShowUsernameSelection, setUsernameSelectionCompleted, setShowTurfIntro, setShowHandleSelection } = authSlice.actions;
export const logout = logoutUser;
export const googleSignIn = googleSignInUser;
export const googleSignUp = googleSignUpUser;
export const updateHandle = updateUserHandle;
export default authSlice.reducer;
