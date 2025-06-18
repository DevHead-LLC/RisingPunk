import React, { createContext, useContext, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getCurrentBalance, updateBalance, addToBalance, subtractFromBalance } from '../store/slices/balanceSlice';
import { useFetchBalanceQuery } from '../store/api/balanceApi';

export function formatBalance(amount: number): string {
  if (amount === undefined || amount === null) return '0';
  return amount.toLocaleString();
}

type BalanceContextType = {
  balance: number | null;
  ratePerSecond: number;
  updateBalance: (newBalance: number, ratePerSecond?: number) => void;
  addToBalance: (amount: number) => void;
  subtractFromBalance: (amount: number) => void;
};

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const balance = useAppSelector(getCurrentBalance);
  const ratePerSecond = useAppSelector((state) => state.balance.ratePerSecond);

  // RTK Query polling for balance
  const { data } = useFetchBalanceQuery(undefined, { pollingInterval: 10000 });
  useEffect(() => {
    if (data) {
      dispatch(updateBalance({ total: data.total, ratePerSecond: data.ratePerSecond }));
    }
  }, [data, dispatch]);

  const updateBalanceHandler = (newBalance: number, newRate?: number) => {
    dispatch(updateBalance({ total: newBalance, ratePerSecond: newRate ?? ratePerSecond }));
  };
  const addToBalanceHandler = (amount: number) => {
    dispatch(addToBalance(amount));
  };
  const subtractFromBalanceHandler = (amount: number) => {
    dispatch(subtractFromBalance(amount));
  };

  return (
    <BalanceContext.Provider value={{
      balance,
      ratePerSecond,
      updateBalance: updateBalanceHandler,
      addToBalance: addToBalanceHandler,
      subtractFromBalance: subtractFromBalanceHandler,
    }}>
      {children}
    </BalanceContext.Provider>
  );
}

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
}; 