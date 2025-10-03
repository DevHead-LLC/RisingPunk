import React, { useEffect } from 'react';
import { useAppDispatch } from '../store/hooks';
import { updateBalance } from '../store/slices/balanceSlice';
import { useFetchBalanceQuery } from '../store/api/balanceApi';

interface DataFetcherProps {
  children: React.ReactNode;
}

export const DataFetcher: React.FC<DataFetcherProps> = ({ children }) => {
  const dispatch = useAppDispatch();

  // Fetch data when component mounts (user is authenticated)
  const { data: balanceData } = useFetchBalanceQuery();
  // Note: Removed botsData and buildStateData to prevent duplicate Redux updates
  // AppContent.tsx already manages bot data in Redux

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

  return <>{children}</>;
};
