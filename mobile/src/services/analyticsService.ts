/**
 * Firebase Analytics Service
 * Centralized service for tracking custom events
 */

import { Platform } from 'react-native';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cached analytics module instance; retries until native Firebase is ready (no permanent lockout on transient errors).
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;

// Session guard: set when user signs up this session so we don't send app_open for "returning" on first session
let accountCreatedThisSession = false;

const getAnalyticsInstance = (): ReturnType<typeof getAnalytics> | null => {
  if (analyticsInstance) {
    return analyticsInstance;
  }
  try {
    analyticsInstance = getAnalytics();
    return analyticsInstance;
  } catch (error) {
    console.error('[Analytics] Failed to create analytics instance:', error);
    return null;
  }
};

/** Called by AppContent to skip app_open when user just signed up this session */
export const getAccountCreatedThisSession = (): boolean => accountCreatedThisSession;
export const clearAccountCreatedThisSession = (): void => {
  accountCreatedThisSession = false;
};

/** How the user obtained a registered / trackable identity (Firebase param signup_method). */
export type AccountCreationMethod = 'email' | 'google' | 'apple' | 'guest' | 'guest_link';

const firebaseAccountCreatedLoggedKey = (userId: string) =>
  `firebase_account_created_logged_${userId}`;

/**
 * Log exactly one `account_created` per user id (persists across sessions).
 * Call only after the server has confirmed success (HTTP 200 + persisted session).
 * Guest link uses the same user id as the prior guest — dedupe prevents a second event.
 */
export const logAccountCreatedOnce = async (params: {
  userId: string;
  method: AccountCreationMethod;
}): Promise<void> => {
  const { userId, method } = params;
  if (!userId || typeof userId !== 'string') {
    // Never throw: callers run after auth success; a bad id must not reject login/signup.
    console.error('[Analytics] logAccountCreatedOnce: missing or invalid userId; skipping account_created');
    return;
  }

  try {
    const already = await AsyncStorage.getItem(firebaseAccountCreatedLoggedKey(userId));
    if (already === 'true') {
      return;
    }
  } catch (error) {
    console.error('[Analytics] Error reading account_created dedupe flag:', error);
  }

  try {
    await markAccountExists();
    accountCreatedThisSession = true;

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return;
    }
    await logEvent(analytics, 'account_created', {
      signup_method: method,
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });
    await AsyncStorage.setItem(firebaseAccountCreatedLoggedKey(userId), 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking account_created:', error);
  }
};

/**
 * Track first app open
 * Call this on first app initialization to mark that app has been opened at least once
 * This is separate from Firebase's automatic first_open event - we use this for our own logic
 */
export const trackFirstOpen = async () => {
  try {
    if (await hasFirstOpened()) {
      return;
    }
    await AsyncStorage.setItem('has_first_opened', 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_open flag:', error);
  }
};

/**
 * Read a boolean flag from AsyncStorage (true only when value === 'true').
 * Returns false on error or missing key.
 */
const checkStorageFlag = async (key: string): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch (error) {
    console.error(`[Analytics] Error checking ${key}:`, error);
    return false;
  }
};

const hasFirstOpened = (): Promise<boolean> => checkStorageFlag('has_first_opened');
const hasAccountCreated = (): Promise<boolean> => checkStorageFlag('has_account_created');

/**
 * Mark that user has an account (for app_returned prerequisite)
 * Call when user successfully logs in to an existing account - so we treat
 * "logged in" as sufficient for "returning user" tracking even if they
 * never created an account on this device.
 */
export const markAccountExists = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('has_account_created', 'true');
  } catch (error) {
    console.error('[Analytics] Error marking account exists:', error);
  }
};

/**
 * Check if prerequisites are met for tracking app return
 * Returns true if both first_open and account_created have occurred
 */
const canTrackAppReturned = async (): Promise<boolean> => {
  try {
    const [hasOpened, hasCreated] = await Promise.all([
      hasFirstOpened(),
      hasAccountCreated(),
    ]);
    return hasOpened && hasCreated;
  } catch (error) {
    console.error('[Analytics] Error checking app_returned prerequisites:', error);
    return false;
  }
};

/**
 * Track first bots build
 * Call this when a user builds bots for the first time
 */
export const trackFirstBots = async (buildType: string, userId: string) => {
  try {
    const key = `has_built_bots_before_${userId}`;
    const hasBuiltBotsBefore = await AsyncStorage.getItem(key);
    if (hasBuiltBotsBefore) {
      // Not first bots build, don't track
      return;
    }

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip tracking
    }
    await logEvent(analytics, 'first_bots', {
      build_type: buildType,
      timestamp: new Date().toISOString(),
    });
    
    // Mark that user has built bots before (only after successful event logging)
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_bots:', error);
  }
};

/**
 * Track first construction
 * Call this when a user constructs their first rental property or research center
 */
export const trackFirstConstruct = async (constructType: 'rental_property' | 'research_center', userId: string, propertyId?: number) => {
  try {
    const key = `has_constructed_before_${userId}`;
    const hasConstructedBefore = await AsyncStorage.getItem(key);
    if (hasConstructedBefore) {
      // Not first construction, don't track
      return;
    }

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip tracking
    }
    await logEvent(analytics, 'first_construct', {
      construct_type: constructType,
      property_id: propertyId,
      timestamp: new Date().toISOString(),
    });
    
    // Mark that user has constructed before (only after successful event logging)
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_construct:', error);
  }
};

/**
 * Track HackMap visit
 * Call this when a user visits the HackMapScreen for the first time
 */
export const trackHackmapVisited = async (userId: string) => {
  try {
    const key = `has_visited_hackmap_${userId}`;
    const hasVisitedHackmap = await AsyncStorage.getItem(key);
    if (hasVisitedHackmap) {
      // Not first visit, don't track
      return;
    }

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip tracking
    }
    await logEvent(analytics, 'hackmap_visited', {
      timestamp: new Date().toISOString(),
    });
    
    // Mark that user has visited hackmap (only after successful event logging)
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking hackmap_visited:', error);
  }
};

/**
 * Track first research
 * Call this when a user starts their first research feature
 */
export const trackFirstResearch = async (categoryId: string, featureId: string, userId: string) => {
  try {
    const key = `has_researched_before_${userId}`;
    const hasResearchedBefore = await AsyncStorage.getItem(key);
    if (hasResearchedBefore) {
      // Not first research, don't track
      return;
    }

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip tracking
    }
    await logEvent(analytics, 'first_research', {
      category_id: categoryId,
      feature_id: featureId,
      timestamp: new Date().toISOString(),
    });
    
    // Mark that user has researched before (only after successful event logging)
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_research:', error);
  }
};

/**
 * Track first battle
 * Call this when a user participates in their first battle
 */
export const trackFirstBattle = async (userId: string) => {
  try {
    const key = `has_battled_before_${userId}`;
    const hasBattledBefore = await AsyncStorage.getItem(key);
    if (hasBattledBefore) {
      // Not first battle, don't track
      return;
    }

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip tracking
    }
    await logEvent(analytics, 'first_battle', {
      timestamp: new Date().toISOString(),
    });
    
    // Mark that user has battled before (only after successful event logging)
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_battle:', error);
  }
};

/**
 * Track app return (returning user with account)
 * Call this when user returns to the app (background→foreground, login, auto-sign in, initial open)
 * Only tracks if both first_open and account_created prerequisites are met.
 *
 * We send the reserved event name app_open. Firebase does NOT auto-log app_open on iOS/Android
 * (only first_open, session_start, user_engagement, etc. are automatic), so this is the only
 * source of app_open and it does not duplicate any automatic event. Use it to measure how many
 * "returning user with account" opens occur in a period; first_open remains the natural
 * once-per-install event from Firebase.
 */
export const trackAppReturned = async () => {
  try {
    if (!(await canTrackAppReturned())) {
      return;
    }

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return;
    }

    await logEvent(analytics, 'app_open', {});
  } catch (error) {
    console.error('[Analytics] Error tracking app_returned:', error);
  }
};


