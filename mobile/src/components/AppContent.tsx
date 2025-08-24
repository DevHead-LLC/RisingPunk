import React, { memo, useEffect, useRef, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { loadStoredAuth } from '../store/slices/authSlice';
import { updateBalance, triggerUpdate } from '../store/slices/balanceSlice';
import { setBots, setBuildState } from '../store/slices/botsSlice';
import { useFetchBalanceQuery } from '../store/api/balanceApi';
import { useFetchBotsQuery, useFetchBuildStateQuery } from '../store/api/botsApi';
import { LoginScreen } from '../screens/LoginScreen';
import { TurfScreen } from '../screens/TurfScreen';
import { FinancialStatementsScreen } from '../screens/FinancialStatementsScreen';
import { setFinancialStatements } from '../store/slices/uiSlice';
import { Dimensions } from 'react-native';

const AppContent = memo(() => {
  const dispatch = useAppDispatch();
  const showFinancials = useAppSelector((state) => state.ui.modals.financialStatements);
  const { token, isLoading } = useAppSelector((state) => state.auth);
  const balanceDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turfScreenRef = useRef<any>(null);

  // Function to center the turf view to home/digital barracks position
  const centerTurfView = useCallback(() => {
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CONTENT_WIDTH = 2000;
    const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
    
    if (turfScreenRef.current?.horizontalScrollRef?.current) {
      turfScreenRef.current.horizontalScrollRef.current.scrollTo({
        x: CENTER_X,
        y: 0,
        animated: false,
      });
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

  useEffect(() => {
    dispatch(loadStoredAuth());
  }, [dispatch]);

  // Update balance slice when data is fetched
  useEffect(() => {
    if (balanceData) {
      dispatch(updateBalance({
        total: balanceData.total,
        ratePerSecond: balanceData.ratePerSecond,
        lastUpdated: balanceData.lastUpdated,
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

  // Show loading state while checking stored auth or fetching data
  if (isLoading || (token && (balanceLoading || botsLoading || buildStateLoading))) {
    return null; // or a loading component
  }

  if (!token) {
    return <LoginScreen />;
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
    </>
  );
});

export default AppContent;
