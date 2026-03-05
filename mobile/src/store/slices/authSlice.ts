import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';
import { getGuestToken, setGuestToken, removeGuestToken, getGuestDeviceId, setGuestDeviceId } from '../../services/guestCredentialsStorage';
import DeviceInfo from 'react-native-device-info';
import { updateBalance } from './balanceSlice';
import { setBots, setBuildState } from './botsSlice';
import { resetAllApiCaches } from '../api/resetApiCaches';
import { clearPersistedTurfNavState } from '../../utils/turfNavStatePersistence';
import { authApi } from '../api/authApi';
import { mapApi } from '../api/mapApi';
import { trackAccountCreated, markAccountExists } from '../../services/analyticsService';

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
  isGuest?: boolean;
  hasPassword?: boolean;
  isAdmin?: boolean;
  guestDeviceId?: string;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      let response;
      try {
        response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
          signal: controller.signal,
        });
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
      // Do not clear guest token (guestCredentialsStorage): the device-linked (guest or linked) token is preserved so
      // after signing out, "Play as Guest" can resume that account on this device.

      // Clear RTK Query caches so new user does not see previous user's data (PM, profile, etc.)
      resetAllApiCaches({ dispatch } as any);

      // Note: Preferences will be synced by AppContent useEffect after login completes

      // Fetch initial data after successful login
      await fetchBotsAndBuildStateForToken(data.token, dispatch, 'Failed to fetch initial data:');

      // Mark that user has an account (so "returning user" tracking works for login-to-existing-account)
      await markAccountExists();
      // app_open is tracked once in AppContent when token/user are set (avoids duplicate on manual login)

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      let response;
      try {
        response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Registration failed' }));
        return rejectWithValue(error.error || 'Registration failed');
      }

      const data = await response.json();

      // Store in AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      // Do not clear guest token (guestCredentialsStorage): preserve device-linked token for "Play as Guest" resume.

      // Track account creation
      await trackAccountCreated('email');

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      clearTimeout(timeoutId);
    }
  }
);

const GUEST_DEVICE_ID_KEY = 'guestDeviceId';

/** Extract hostname from API_URL for logging (handles URL with/without protocol). */
function getApiHostForLogging(): string {
  try {
    const u = new URL(API_URL);
    return u.hostname || 'unknown';
  } catch {
    try {
      const u = new URL(`https://${API_URL}`);
      return u.hostname || 'unknown';
    } catch {
      return typeof API_URL === 'string' ? API_URL.slice(0, 60) : 'unknown';
    }
  }
}

/** Stable device ID for "one guest per device"; created once per install and sent with POST /auth/guest. Persisted in Keychain + AsyncStorage so it survives storage clears. */
async function getOrCreateGuestDeviceId(): Promise<string> {
  let id = await getGuestDeviceId();
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    await setGuestDeviceId(id);
  }
  return id;
}

/** Result of trying to resume the device-linked guest/linked account. */
type ResumeResult =
  | { ok: true; token: string; user: any }
  | { ok: false; reason: 'invalid' }   // permanent failure — clear stored token and allow new guest
  | { ok: false; reason: 'network' };   // transient — keep stored token so retry can resume

/**
 * Resumes the session for the account previously linked to this device (guest or formerly-guest-now-linked).
 * Intentional: we do NOT require userData.user.isGuest. If the user linked their guest account and then
 * signed out, "Play as Guest" should still resume that same account on this device (one-tap return to their
 * device-linked identity), not create a new guest.
 */
async function resumeGuestSession(guestToken: string): Promise<ResumeResult> {
  try {
    const response = await fetch(`${API_URL}/api/auth/verify-token`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${guestToken}` },
    });
    // Permanent failures: clear stored token so user can create a new guest (no stuck error loop).
    if (response.status === 401) return { ok: false, reason: 'invalid' }; // token invalid/expired
    if (response.status === 404) return { ok: false, reason: 'invalid' }; // user deleted
    if (!response.ok) {
      return { ok: false, reason: 'network' };
    }
    const userData = await response.json();
    if (!userData.user) return { ok: false, reason: 'invalid' };
    return { ok: true, token: guestToken, user: userData.user };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

async function fetchBotsAndBuildStateForToken(token: string, dispatch: any, logContext: string): Promise<void> {
  try {
    const botsResponse = await fetch(`${API_URL}/api/bots`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (botsResponse.ok) {
      const botsData = await botsResponse.json();
      dispatch(setBots(botsData.bots));
    }
    const buildStateResponse = await fetch(`${API_URL}/api/bots/build-state`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (buildStateResponse.ok) {
      const buildStateData = await buildStateResponse.json();
      dispatch(setBuildState(buildStateData));
    }
  } catch (fetchError) {
    console.warn(logContext, fetchError);
  }
}

/**
 * Play as Guest: use the account linked to this device if one exists (guest or formerly-guest-now-linked),
 * otherwise create a new guest. Each return to the app can use "Play as Guest" to resume that same
 * device-linked account rather than creating a new one.
 */
export type PlayAsGuestPayload = { forceNew?: boolean } | void;

export const playAsGuest = createAsyncThunk(
  'auth/playAsGuest',
  async (payload: PlayAsGuestPayload, { rejectWithValue, dispatch }) => {
    try {
      const forceNew = payload && typeof payload === 'object' && payload.forceNew === true;
      if (forceNew) {
        await removeGuestToken();
      }

      const storedGuestToken = await getGuestToken();

      if (storedGuestToken) {
        const result = await resumeGuestSession(storedGuestToken);
        if (result.ok) {
          await AsyncStorage.setItem('token', result.token);
          await AsyncStorage.setItem('user', JSON.stringify(result.user));
          if (result.user?.guestDeviceId) {
            await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, result.user.guestDeviceId);
          }
          resetAllApiCaches({ dispatch } as any);
          await fetchBotsAndBuildStateForToken(result.token, dispatch, 'Failed to fetch initial data for guest resume:');
          await markAccountExists();
          return { token: result.token, user: result.user };
        }
        // Only clear stored guest token when it's definitively invalid (401). On network/transient
        // errors, keep it so the next "Play as Guest" retry can resume instead of creating a new guest.
        if (!result.ok && 'reason' in result && result.reason === 'invalid') {
          await removeGuestToken();
          return rejectWithValue('Previous session expired. Sign in with your account or tap Play as Guest to create a new guest.');
        }
        return rejectWithValue('Network error. Check your connection and try "Play as Guest" again to resume your account.');
      }

      const deviceId = await getOrCreateGuestDeviceId();
      let vendorId: string | undefined;
      try {
        const id = await DeviceInfo.getUniqueId();
        if (id && typeof id === 'string' && id.trim().length > 0) vendorId = id.trim();
      } catch {
        // Non-fatal; server can still use deviceId
      }
      const guestUrl = `${API_URL}/api/auth/guest`;
      let response: Response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        response = await fetch(guestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId, ...(vendorId && { vendorId }), ...(forceNew && { forceNew: true }) }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const apiHost = getApiHostForLogging();
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const serverMessage = (errorBody && typeof errorBody.error === 'string') ? errorBody.error : (errorBody && typeof errorBody.message === 'string') ? errorBody.message : '';
        const userMessage = serverMessage || 'Failed to create guest account';
        console.error('[auth] Guest creation failed', { apiHost, status: response.status, statusText: response.statusText, body: errorBody });
        return rejectWithValue(userMessage);
      }

      const data = await response.json();
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      await setGuestToken(data.token);
      if (data.user?.guestDeviceId) {
        await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, data.user.guestDeviceId);
      }

      resetAllApiCaches({ dispatch } as any);
      await fetchBotsAndBuildStateForToken(data.token, dispatch, 'Failed to fetch initial data for guest:');

      await markAccountExists();
      // New guest: clear persisted turf nav so they start on turf, not previous user's screen (e.g. map locked for new account).
      await clearPersistedTurfNavState();
      return data;
    } catch (error) {
      console.error('[auth] Play as guest error', { apiHost: getApiHostForLogging(), error });
      if (error instanceof Error && error.name === 'AbortError') {
        return rejectWithValue('Network error: Cannot connect to server');
      }
      if (error instanceof TypeError && (error.message.includes('Network request failed') || error.message.includes('Failed to fetch'))) {
        return rejectWithValue('Network error: Cannot connect to server');
      }
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
      // Do not clear guest token (guestCredentialsStorage): preserve device-linked token for "Play as Guest" resume.

      // Clear any existing RTK Query cache to ensure fresh data for new user
      resetAllApiCaches({ dispatch } as any);

      await fetchBotsAndBuildStateForToken(data.token, dispatch, 'Failed to fetch initial data:');

      // Mark that user has an account (so "returning user" tracking works for login-to-existing-account)
      await markAccountExists();
      // app_open is tracked once in AppContent when token/user are set (avoids duplicate on manual login)

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
      // Do not clear guest token (guestCredentialsStorage): preserve device-linked token for "Play as Guest" resume.

      // Track account creation
      await trackAccountCreated('google');

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

        await fetchBotsAndBuildStateForToken(data.token, dispatch, 'Failed to fetch initial data for Google sign-up:');
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
      // Do not clear guest token (guestCredentialsStorage): preserve device-linked token for "Play as Guest" resume.

      // Clear any existing RTK Query cache to ensure fresh data for new user
      resetAllApiCaches({ dispatch } as any);

      await fetchBotsAndBuildStateForToken(data.token, dispatch, 'Failed to fetch initial data:');

      // Mark that user has an account (so "returning user" tracking works for login-to-existing-account)
      await markAccountExists();
      // app_open is tracked once in AppContent when token/user are set (avoids duplicate on manual login)

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
      // Do not clear guest token (guestCredentialsStorage): preserve device-linked token for "Play as Guest" resume.

      // Track account creation
      await trackAccountCreated('apple');

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

        await fetchBotsAndBuildStateForToken(data.token, dispatch, 'Failed to fetch initial data for Apple sign-up:');
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
      // Invalidate map so HackMap refetches and shows updated handle; avoids stale grid and 0,0 / locator issues
      dispatch(mapApi.util.invalidateTags(['Map']));

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
  async (_, { dispatch, getState }) => {
    // Clear current session only. Do NOT clear guest token (guestCredentialsStorage):
    // - If the user logged out from the device-linked account (guest or linked), it already
    //   holds that token; leaving it allows "Play as Guest" to resume later.
    // - If the user logged out from another account (Apple/Google/handle), we must not overwrite
    //   it with that token; leaving it preserves the previous device-linked token so
    //   "Play as Guest" can resume the guest (or linked) account after signing out.
    const userId = (getState() as { auth: AuthState }).auth.user?._id ?? undefined;
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await clearPersistedTurfNavState(userId);

    // Note: We do NOT clear first-time tracking flags on logout.
    // With user-scoped keys (e.g., has_built_bots_before_${userId}), flags should
    // persist across sessions so the same user doesn't get duplicate first-time events.
    // Each user's flags are independent and don't interfere with other users.
    
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

      if (userData.user?.isGuest) {
        await setGuestToken(storedToken);
        if (userData.user?.guestDeviceId) {
          await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, userData.user.guestDeviceId);
        }
      }

      // Mark that user has an account (so app_open tracking works for auto-sign-in returning users)
      await markAccountExists();

      // Note: App return tracking for auto-sign in is handled in AppContent.tsx
      // when token/user is set, to avoid duplicate tracking

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

      await fetchBotsAndBuildStateForToken(token, dispatch, 'Failed to fetch initial data:');

      return { success: true };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Shared fetch for user profile — single source of truth for refreshUserData and refreshUserDataSilent (Bugbot: avoid duplicated thunk/reducer logic).
async function fetchUserProfile(token: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_URL}/api/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return response.json();
}

export const refreshUserData = createAsyncThunk(
  'auth/refreshUserData',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { token } = state.auth;
      if (!token) return rejectWithValue('No authentication token');
      return await fetchUserProfile(token);
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return rejectWithValue('Failed to refresh user data');
    }
  }
);

/** Same fetch as refreshUserData but does not set auth.isLoading. Use when updating user (e.g. unlockedFeatures) without showing app-level loading or unmounting the UI. */
export const refreshUserDataSilent = createAsyncThunk(
  'auth/refreshUserDataSilent',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const { token } = state.auth;
      if (!token) return rejectWithValue('No authentication token');
      return await fetchUserProfile(token);
    } catch (error) {
      console.error('Error refreshing user data (silent):', error);
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

      await fetchBotsAndBuildStateForToken(token, dispatch, 'Failed to fetch bots/build-state during data refresh:');

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

// Shared state update for user profile payload — single source of truth for refreshUserData and refreshUserDataSilent .fulfilled (Bugbot: avoid duplicated reducer logic).
function applyUserProfilePayload(
  state: AuthState,
  payload: Record<string, unknown> | null | undefined
): void {
  if (!state.user || !payload) return;
  if (typeof payload.email === 'string') state.user.email = payload.email;
  state.user.emailVerified = payload.emailVerified === true;
  state.user.handle = (payload.handle as string) ?? state.user.handle;
  state.user.level = typeof payload.level === 'number' ? payload.level : state.user.level;
  state.user.unlockedFeatures = (payload.unlockedFeatures as User['unlockedFeatures']) ?? state.user.unlockedFeatures;
  state.user.profileGender = (payload.profileGender as User['profileGender']) ?? state.user.profileGender;
  if (typeof payload.onboardingCompleted === 'boolean') state.user.onboardingCompleted = payload.onboardingCompleted;
  if (typeof payload.needsHandleSelection === 'boolean') state.user.needsHandleSelection = payload.needsHandleSelection;
  state.user.totalGuardiansBuilt = typeof payload.totalGuardiansBuilt === 'number' ? payload.totalGuardiansBuilt : (state.user.totalGuardiansBuilt ?? 0);
  if (typeof payload.isGuest === 'boolean') state.user.isGuest = payload.isGuest;
  if (typeof payload.hasPassword === 'boolean') state.user.hasPassword = payload.hasPassword;
  if (payload.emailVerified === true) state.emailVerificationPromptedUserId = null;
}

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
    /** Update user level from battle end (or other source). No fetch, no loading — so Research Center and other UI see new level live. */
    setUserLevel: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.level = action.payload;
      }
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
        state.isLoading = true;
        state.error = null;
      })
          .addCase(registerUser.fulfilled, (state, action) => {
      state.isLoading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      state.showOnboarding = !action.payload.user.onboardingCompleted;
      state.showHandleSelection = action.payload.user.needsHandleSelection;
      state.isInitialized = true; // Mark as initialized after successful registration
    })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.token = null;
        state.user = null;
        state.isInitialized = false;
      })

      .addCase(playAsGuest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(playAsGuest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
        state.showOnboarding = !action.payload.user.onboardingCompleted;
        state.showHandleSelection = action.payload.user.needsHandleSelection;
        state.isInitialized = true;
      })
      .addCase(playAsGuest.rejected, (state, action) => {
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
        // Show email verification modal after handle selection only if user has an email to verify (not guest)
        if (state.user && !state.user.emailVerified && !state.user.isGuest) {
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
        applyUserProfilePayload(state, action.payload as Record<string, unknown> | null);
      })
      .addCase(refreshUserData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(refreshUserDataSilent.fulfilled, (state, action) => {
        applyUserProfilePayload(state, action.payload as Record<string, unknown> | null);
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

export const { clearError, setCredentials, setOnboardingCompleted, setShowOnboarding, setShowTurfIntro, setShowHandleSelection, setShowEmailVerification, setShowEmailVerificationBanner, setEmailVerificationPrompted, forceRefreshData, setShowAccountSwitched, setShowAccountSwitchedBanner, setUserLevel, handleAccountSwitched } = authSlice.actions;
export const logout = logoutUser;
export const googleSignIn = googleSignInUser;
export const googleSignUp = googleSignUpUser;
export const appleSignIn = appleSignInUser;
export const appleSignUp = appleSignUpUser;
export const updateHandle = updateUserHandle;
export const forceRefresh = forceRefreshAllData;
export default authSlice.reducer;
