/**
 * Firebase Analytics Service
 * Centralized service for tracking custom events
 */

import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get analytics instance (singleton pattern)
let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
let initializationAttempted = false;

const getAnalyticsInstance = (): ReturnType<typeof getAnalytics> | null => {
  // If initialization was already attempted and failed, don't retry
  if (initializationAttempted && !analyticsInstance) {
    return null;
  }

  if (!analyticsInstance) {
    try {
      analyticsInstance = getAnalytics();
      initializationAttempted = true;
    } catch (error) {
      console.error('[Analytics] Failed to create analytics instance:', error);
      initializationAttempted = true;
      return null; // Return null instead of throwing to prevent retries
    }
  }
  return analyticsInstance;
};

/**
 * Track account creation
 * Call this when a user successfully creates an account
 */
export const trackAccountCreated = async (method: 'email' | 'google' | 'apple') => {
  try {
    // Set prerequisite first so returning-user tracking works even if analytics fails
    await AsyncStorage.setItem('has_account_created', 'true');

    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip event (flag already set)
    }
    await logEvent(analytics, 'account_created', {
      signup_method: method,
      timestamp: new Date().toISOString(),
    });
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
    const hasOpenedBefore = await AsyncStorage.getItem('has_first_opened');
    if (hasOpenedBefore) {
      // Already tracked, don't track again
      return;
    }
    
    // Mark that app has been opened (for app_returned prerequisite check)
    await AsyncStorage.setItem('has_first_opened', 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_open flag:', error);
  }
};

/**
 * Check if app has been opened at least once
 */
export const hasFirstOpened = async (): Promise<boolean> => {
  try {
    const hasOpened = await AsyncStorage.getItem('has_first_opened');
    return hasOpened === 'true';
  } catch (error) {
    console.error('[Analytics] Error checking has_first_opened:', error);
    return false;
  }
};

/**
 * Check if account has been created
 */
export const hasAccountCreated = async (): Promise<boolean> => {
  try {
    const hasCreated = await AsyncStorage.getItem('has_account_created');
    return hasCreated === 'true';
  } catch (error) {
    console.error('[Analytics] Error checking has_account_created:', error);
    return false;
  }
};

/**
 * Mark that user has an account (for app_returned prerequisite)
 * Call when user successfully logs in to an existing account - so we treat
 * "logged in" as sufficient for "returning user" tracking even if they
 * never created an account on this device.
 */
export const markAccountExists = async () => {
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
 * Only tracks if both first_open and account_created prerequisites are met
 * Uses Firebase's standard logAppOpen() which sends app_open event to GA4
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

    // Send standard app_open event to GA4 (same as logAppOpen; logEvent avoids deprecation warning)
    await logEvent(analytics, 'app_open', {});
  } catch (error) {
    console.error('[Analytics] Error tracking app_returned:', error);
  }
};


