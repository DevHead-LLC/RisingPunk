import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, Dimensions, AppState, Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useThemeColors } from '../hooks/useThemeColors';
import { loadStoredAuth, updateHandle, setShowEmailVerification, setShowEmailVerificationBanner, refreshUserData, logoutUser, setShowAccountSwitched, setShowAccountSwitchedBanner } from '../store/slices/authSlice';
import { updateBalance, triggerUpdate } from '../store/slices/balanceSlice';
import { setBots, setBuildState } from '../store/slices/botsSlice';
import { syncPreferencesFromStorage, syncPreferencesFromUser } from '../store/slices/preferencesSlice';
import { useFetchBalanceQuery } from '../store/api/balanceApi';
import { useFetchBotsQuery, useFetchBuildStateQuery } from '../store/api/botsApi';
import { useGetProfileQuery } from '../store/api/authApi';
import { LoginScreen } from '../screens/LoginScreen';
import { TurfScreen } from '../screens/TurfScreen';
import { FinancialStatementsScreen } from '../screens/FinancialStatementsScreen';
import { setFinancialStatements, setGlobalErrorModal } from '../store/slices/uiSlice';
import { useNetworkConnectivity } from '../providers/NetworkConnectivityProvider';
import { ConnectivityOverlay } from './common/ConnectivityOverlay';
import { HandleSelectionModal } from './modals/HandleSelectionModal';
import { EmailVerificationModal } from './modals/EmailVerificationModal';
import { GlobalErrorModal } from './modals/GlobalErrorModal';
import { AccountSwitchedModal } from './modals/AccountSwitchedModal';
import { NotificationBanner } from './common/NotificationBanner';
import { globalErrorHandler } from '../services/GlobalErrorHandler';
import { getAnalytics, setAnalyticsCollectionEnabled, setUserProperty, logEvent } from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackAppReturned, trackFirstOpen, getAccountCreatedThisSession, clearAccountCreatedThisSession } from '../services/analyticsService';

const AppContent = memo(() => {
  const dispatch = useAppDispatch();
  const colors = useThemeColors();
  const showFinancials = useAppSelector((state) => state.ui.modals.financialStatements);
  const showGlobalError = useAppSelector((state) => state.ui.modals.globalError);
  const { token, isLoading, showHandleSelection, showEmailVerification, showEmailVerificationBanner, showAccountSwitched, showAccountSwitchedBanner, user } = useAppSelector((state) => state.auth);
  
  const balanceDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turfScreenRef = useRef<any>(null);
  const previousTokenRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const hasTrackedInitialOpenRef = useRef<boolean>(false);
  const { isConnected, isInternetReachable } = useNetworkConnectivity();

  // Function to center the turf view to home/digital barracks position
  const centerTurfView = useCallback(() => {
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CONTENT_WIDTH = 2000;
    const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
    
    if (Platform.OS === 'android') {
      // For Android, use the centerAndroidView function from TurfScreen
      if (turfScreenRef.current?.centerAndroidView) {
        turfScreenRef.current.centerAndroidView();
      }
    } else {
      // For iOS, use the horizontalScrollRef
      if (turfScreenRef.current?.horizontalScrollRef?.current) {
        turfScreenRef.current.horizontalScrollRef.current.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }
    }
  }, []);

  // Fetch data when authenticated
  const { data: balanceData, isLoading: balanceLoading } = useFetchBalanceQuery(undefined, {
    skip: !token,
    pollingInterval: 10000, // Poll every 10 seconds
  });

  const { data: botsData, isLoading: botsLoading } = useFetchBotsQuery(undefined, {
    skip: !token,
    pollingInterval: 10000, // Poll every 10 seconds
  });

  const { data: buildStateData, isLoading: buildStateLoading } = useFetchBuildStateQuery(undefined, {
    skip: !token,
    pollingInterval: 10000, // Poll every 10 seconds
  });

  // Fetch fresh user profile data to get latest preferences
  const { data: profileData } = useGetProfileQuery(undefined, {
    skip: !token,
  });



  useEffect(() => {
    const init = async () => {
      // Set first-open flag before loading auth so token/user effect doesn't race past it
      await trackFirstOpen();
      dispatch(loadStoredAuth());
    };
    init();
  }, [dispatch]);

  // Initialize Firebase Analytics
  // Firebase automatically logs first_open (once per install), session_start, user_engagement, etc.
  // Firebase does NOT auto-log app_open on mobile; we log app_open manually in trackAppReturned()
  // for "returning user with account" only, so first_open and app_open stay separate and non-duplicating.
  useEffect(() => {
    const initializeFirebaseAnalytics = async () => {
      try {
        // Get analytics instance using modular API
        let analytics;
        try {
          analytics = getAnalytics();
        } catch (error) {
          console.error('[Firebase Analytics] Error getting analytics instance:', error);
          return;
        }
        
        // Enable analytics collection
        try {
          await setAnalyticsCollectionEnabled(analytics, true);
        } catch (error) {
          console.error('[Firebase Analytics] Error enabling collection:', error);
          return;
        }
        
        // Set user property for platform to make filtering easier
        try {
          await setUserProperty(analytics, 'platform', Platform.OS);
        } catch (error) {
          // Continue even if this fails
        }
        
        // Log a custom test event to verify analytics is working
        try {
          await logEvent(analytics, 'analytics_initialized', {
            platform: Platform.OS,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('[Firebase Analytics] Error logging test event:', error);
        }
      } catch (error) {
        console.error('[Firebase Analytics] Initialization error:', error);
        // Don't throw - analytics errors shouldn't break the app
      }
    };
    
    initializeFirebaseAnalytics();
  }, []);

  // Initialize GlobalErrorHandler with Redux callbacks (only once)
  useEffect(() => {
    globalErrorHandler.initialize(dispatch, () => {
      // Get current state using the selector pattern
      // We'll create a simple state getter that doesn't import the store
      const currentState = {
        auth: { token: token }
      };
      return currentState;
    });
  }, [dispatch, token]);

  // Clear global error modal on logout or new session
  useEffect(() => {
    const previousToken = previousTokenRef.current;
    
    // Clear error state when token becomes null (logout)
    if (!token && showGlobalError) {
      dispatch(setGlobalErrorModal(false));
    }
    
    // Clear error state when transitioning from null to a value (new session/login)
    if (token && !previousToken && showGlobalError) {
      dispatch(setGlobalErrorModal(false));
    }
    
    previousTokenRef.current = token;
  }, [token, showGlobalError, dispatch]);

  // Sync preferences after auth is loaded
  useEffect(() => {
    if (token) {
      // Small delay to ensure store is fully initialized
      const timer = setTimeout(() => {
        dispatch(syncPreferencesFromStorage());
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [token, dispatch]);

  // Sync preferences from fresh profile data from database
  useEffect(() => {
    if (profileData?.profileGender) {
      dispatch(syncPreferencesFromUser({ profileGender: profileData.profileGender }));
    }
  }, [profileData?.profileGender, dispatch]);

  // Update balance slice when data is fetched
  useEffect(() => {
    if (balanceData) {      
      dispatch(updateBalance({
        total: balanceData.total,
        ratePerSecond: balanceData.ratePerSecond,
        lastUpdated: balanceData.lastUpdated,
        fractionalRemainder: balanceData.fractionalRemainder,
      }));
    }
  }, [balanceData, dispatch]);

  // Update bots slice when data is fetched
  useEffect(() => {
    if (botsData) {
      dispatch(setBots(botsData.bots));
    }
  }, [botsData, dispatch]);

  // Update build state when data is fetched
  useEffect(() => {
    if (buildStateData) {
      dispatch(setBuildState(buildStateData));
    }
  }, [buildStateData, dispatch]);

  // Reset initial-open tracking ref on logout so the next login (same or different user) gets one app_open
  useEffect(() => {
    if (!token) {
      hasTrackedInitialOpenRef.current = false;
    }
  }, [token]);

  // Track app return on initial app open when user is already logged in (auto-sign in or manual login)
  // Only track once per login; skip if user just signed up this session (not a "returning" user yet)
  useEffect(() => {
    if (token && user && !hasTrackedInitialOpenRef.current) {
      hasTrackedInitialOpenRef.current = true;
      if (getAccountCreatedThisSession()) {
        clearAccountCreatedThisSession();
        return;
      }
      trackAppReturned();
    }
  }, [token, user]);

  // Refresh user data when app comes back to foreground (e.g., after email verification)
  // Also track app return for analytics
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      // Track when app returns from background to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Only track app return when user is logged in (same as initial-open tracking)
        if (token && user) {
          trackAppReturned();
        }
      }
      
      appStateRef.current = nextAppState;
      
      if (nextAppState === 'active' && token && user) {
        // Refresh user data when app becomes active
        dispatch(refreshUserData());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [dispatch, token, user]);

  // Set up balance display timer to trigger selector recalculation every 10 seconds
  useEffect(() => {
    if (!token) {
      if (balanceDisplayTimerRef.current) {
        clearInterval(balanceDisplayTimerRef.current);
        balanceDisplayTimerRef.current = null;
      }
      return;
    }

    // Start timer to trigger balance selector recalculation for display updates
    if (!balanceDisplayTimerRef.current) {
      balanceDisplayTimerRef.current = setInterval(() => {
        dispatch(triggerUpdate());
      }, 10000);
    }

    return () => {
      if (balanceDisplayTimerRef.current) {
        clearInterval(balanceDisplayTimerRef.current);
        balanceDisplayTimerRef.current = null;
      }
    };
  }, [token, dispatch]);

  // Handle handle selection submission
  const handleHandleSubmit = useCallback(async (handle: string) => {
    try {
      await dispatch(updateHandle(handle)).unwrap();
    } catch (error) {
      throw error; // Re-throw to let the modal handle the error
    }
  }, [dispatch]);

  // Handle global error modal log out
  const handleGlobalErrorLogOut = useCallback(() => {
    dispatch(setGlobalErrorModal(false));
    dispatch(logoutUser());
  }, [dispatch]);

  // Handle account switched modal log out
  const handleAccountSwitchedLogOut = useCallback(() => {
    dispatch(setShowAccountSwitched(false));
    dispatch(logoutUser());
  }, [dispatch]);

  // Handle account switched banner close
  const handleAccountSwitchedBannerClose = useCallback(() => {
    dispatch(setShowAccountSwitchedBanner(false));
  }, [dispatch]);

  // Determine if we should show the connectivity overlay
  // Only show when we're definitely disconnected (both flags are false)
  const shouldShowConnectivityOverlay = isConnected === false && isInternetReachable === false;

  // Note: Debug logging removed - was used for troubleshooting black screen issue

  // Show loading state while checking stored auth or fetching data
  // Return a View with background color instead of null to prevent black screen
  if (isLoading || (token && (balanceLoading || botsLoading || buildStateLoading))) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!token) {
    return (
      <>
        <LoginScreen />
        <NotificationBanner
          visible={showAccountSwitchedBanner}
          message="Someone else logged into this account on another device. You have been logged out."
          type="info"
          duration={5000}
          onClose={handleAccountSwitchedBannerClose}
        />
        <ConnectivityOverlay visible={shouldShowConnectivityOverlay} />
      </>
    );
  }

  return (
    <>
      <TurfScreen ref={turfScreenRef} />
      {showFinancials && (
        <FinancialStatementsScreen onClose={() => {
          dispatch(setFinancialStatements(false));
          centerTurfView();
        }} />
      )}
      <HandleSelectionModal
        visible={showHandleSelection}
        onSubmit={handleHandleSubmit}
        isLoading={isLoading}
        isRequired={true}
      />
      <EmailVerificationModal
        visible={showEmailVerification}
        userEmail={user?.email}
        userHandle={user?.handle}
        onClose={() => dispatch(setShowEmailVerification(false))}
        onVerificationSent={() => {
          // Show banner notification
          dispatch(setShowEmailVerificationBanner(true));
        }}
        isRequired={false}
      />
      <NotificationBanner
        visible={showEmailVerificationBanner}
        message="Please check your email for verification link within 72 hours"
        type="success"
        duration={5000}
        onClose={() => dispatch(setShowEmailVerificationBanner(false))}
      />
      <GlobalErrorModal
        visible={showGlobalError && !!token}
        onLogOut={handleGlobalErrorLogOut}
      />
      <AccountSwitchedModal
        visible={showAccountSwitched}
        onLogOut={handleAccountSwitchedLogOut}
      />
      <ConnectivityOverlay visible={shouldShowConnectivityOverlay} />
    </>
  );
});

export default AppContent;
