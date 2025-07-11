import React, { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateBalance } from '../store/slices/balanceSlice';
import { setBots, setBuildState } from '../store/slices/botsSlice';
import { useFetchBalanceQuery } from '../store/api/balanceApi';
import { useFetchBotsQuery, useFetchBuildStateQuery } from '../store/api/botsApi';

interface DataFetcherProps {
  children: React.ReactNode;
}

export const DataFetcher: React.FC<DataFetcherProps> = ({ children }) => {
  const dispatch = useAppDispatch();

  // Fetch data when component mounts (user is authenticated)
  const { data: balanceData } = useFetchBalanceQuery();
  const { data: botsData } = useFetchBotsQuery();
  const { data: buildStateData } = useFetchBuildStateQuery();

  // Update balance slice when data is fetched
  useEffect(() => {
    if (balanceData) {
      dispatch(updateBalance({
        total: balanceData.total,
        ratePerSecond: balanceData.ratePerSecond,
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

  return <>{children}</>;
};
