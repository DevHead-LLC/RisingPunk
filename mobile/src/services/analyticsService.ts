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
    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip tracking
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
 * Track app return
 * Call this when user returns to the app from background
 * This is more reliable than Firebase's automatic app_open event
 */
export const trackAppReturned = async () => {
  try {
    const analytics = getAnalyticsInstance();
    if (!analytics) {
      return; // Analytics not available, skip tracking
    }
    await logEvent(analytics, 'app_returned', {
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Analytics] Error tracking app_returned:', error);
  }
};

/**
 * Clear first-time tracking flags for a specific user from AsyncStorage
 * Call this when a user logs out to clear their flags
 */
export const clearFirstTimeTrackingFlags = async (userId: string) => {
  try {
    const keysToRemove = [
      `has_built_bots_before_${userId}`,
      `has_constructed_before_${userId}`,
      `has_visited_hackmap_${userId}`,
      `has_researched_before_${userId}`,
      `has_battled_before_${userId}`,
    ];
    
    await Promise.all(
      keysToRemove.map(key => AsyncStorage.removeItem(key))
    );
  } catch (error) {
    console.error('[Analytics] Error clearing first-time tracking flags:', error);
  }
};

/**
 * Check if user changed and clear previous user's flags if needed
 * Call this on login/loadStoredAuth to handle user switching
 */
export const handleUserSwitch = async (newUserId: string) => {
  try {
    const lastUserIdKey = 'last_analytics_user_id';
    const lastUserId = await AsyncStorage.getItem(lastUserIdKey);
    
    // If there's a previous user and it's different, clear their flags
    if (lastUserId && lastUserId !== newUserId) {
      await clearFirstTimeTrackingFlags(lastUserId);
    }
    
    // Update the last user ID
    await AsyncStorage.setItem(lastUserIdKey, newUserId);
  } catch (error) {
    console.error('[Analytics] Error handling user switch:', error);
  }
};

