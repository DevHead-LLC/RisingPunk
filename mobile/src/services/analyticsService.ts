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
export const trackFirstBots = async (buildType: string) => {
  try {
    const hasBuiltBotsBefore = await AsyncStorage.getItem('has_built_bots_before');
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
    await AsyncStorage.setItem('has_built_bots_before', 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_bots:', error);
  }
};

/**
 * Track first construction
 * Call this when a user constructs their first rental property or research center
 */
export const trackFirstConstruct = async (constructType: 'rental_property' | 'research_center', propertyId?: number) => {
  try {
    const hasConstructedBefore = await AsyncStorage.getItem('has_constructed_before');
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
    await AsyncStorage.setItem('has_constructed_before', 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_construct:', error);
  }
};

/**
 * Track HackMap visit
 * Call this when a user visits the HackMapScreen for the first time
 */
export const trackHackmapVisited = async () => {
  try {
    const hasVisitedHackmap = await AsyncStorage.getItem('has_visited_hackmap');
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
    await AsyncStorage.setItem('has_visited_hackmap', 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking hackmap_visited:', error);
  }
};

/**
 * Track first research
 * Call this when a user starts their first research feature
 */
export const trackFirstResearch = async (categoryId: string, featureId: string) => {
  try {
    const hasResearchedBefore = await AsyncStorage.getItem('has_researched_before');
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
    await AsyncStorage.setItem('has_researched_before', 'true');
  } catch (error) {
    console.error('[Analytics] Error tracking first_research:', error);
  }
};

/**
 * Track first battle
 * Call this when a user participates in their first battle
 */
export const trackFirstBattle = async () => {
  try {
    const hasBattledBefore = await AsyncStorage.getItem('has_battled_before');
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
    await AsyncStorage.setItem('has_battled_before', 'true');
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
 * Clear all first-time tracking flags from AsyncStorage
 * Call this when a user logs out to ensure the next user on the same device
 * can have their first-time events tracked correctly
 */
export const clearFirstTimeTrackingFlags = async () => {
  try {
    const keysToRemove = [
      'has_built_bots_before',
      'has_constructed_before',
      'has_visited_hackmap',
      'has_researched_before',
      'has_battled_before',
    ];
    
    await Promise.all(
      keysToRemove.map(key => AsyncStorage.removeItem(key))
    );
  } catch (error) {
    console.error('[Analytics] Error clearing first-time tracking flags:', error);
  }
};

