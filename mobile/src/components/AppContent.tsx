import React, { memo, useEffect, useRef, useCallback } from 'react';
import { View, Text, Dimensions, AppState, Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
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
import { getEnvironmentInfo } from '../config';
import { getBuildInfo } from '../utils/BuildInfo';

const AppContent = memo(() => {
  const dispatch = useAppDispatch();
  const showFinancials = useAppSelector((state) => state.ui.modals.financialStatements);
  const showGlobalError = useAppSelector((state) => state.ui.modals.globalError);
  const { token, isLoading, showHandleSelection, showEmailVerification, showEmailVerificationBanner, showAccountSwitched, showAccountSwitchedBanner, user } = useAppSelector((state) => state.auth);
  const balanceDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turfScreenRef = useRef<any>(null);
  const previousTokenRef = useRef<string | null>(null);
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
    dispatch(loadStoredAuth());
    
    // Log environment and build info on app startup
    const logStartupInfo = async () => {
      try {
        const envInfo = getEnvironmentInfo();
        const buildInfo = await getBuildInfo();
        
        console.log('========================================');
        console.log('🚀 APP STARTUP - BUILD & ENVIRONMENT INFO');
        console.log('========================================');
        console.log('Build Info:');
        console.log(`  - Version Code: ${buildInfo.versionCode}`);
        console.log(`  - Version Name: ${buildInfo.versionName}`);
        console.log(`  - Debug Build: ${buildInfo.debug}`);
        console.log('Environment Info:');
        console.log(`  - API_ENV: ${envInfo.apiEnv}`);
        console.log(`  - API_URL: ${envInfo.apiUrl}`);
        console.log(`  - Production Build: ${envInfo.isProductionBuild}`);
        console.log(`  - Dev Mode: ${envInfo.isDevMode}`);
        console.log('Config Object:');
        console.log(JSON.stringify(envInfo.configObject, null, 2));
        
        // Critical warning for production builds
        if (envInfo.isProductionBuild) {
          if (envInfo.apiEnv !== 'prod' || !envInfo.apiUrl.includes('risingpunk.com')) {
            console.error('🚨🚨🚨 CRITICAL: Production build NOT using production environment!');
            console.error(`Expected: API_ENV=prod, API_URL=https://api.risingpunk.com`);
            console.error(`Actual: API_ENV=${envInfo.apiEnv}, API_URL=${envInfo.apiUrl}`);
          } else {
            console.log('✅ Production build verified: Using production environment');
          }
        }
        console.log('========================================');
      } catch (error) {
        console.error('Failed to log startup info:', error);
      }
    };
    
    logStartupInfo();
  }, [dispatch]);

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

  // Refresh user data when app comes back to foreground (e.g., after email verification)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
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

  // Show loading state while checking stored auth or fetching data
  if (isLoading || (token && (balanceLoading || botsLoading || buildStateLoading))) {
    return null; // or a loading component
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
