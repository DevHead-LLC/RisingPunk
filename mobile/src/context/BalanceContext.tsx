import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';

type BalanceContextType = {
  balance: number | null;
  ratePerSecond: number;
  updateBalance: (newBalance: number) => void;
  addToBalance: (amount: number) => void;
  subtractFromBalance: (amount: number) => void;
};

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function formatBalance(amount: number): string {
  if (amount === undefined || amount === null) return '0';
  return amount.toLocaleString();
}

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [ratePerSecond, setRatePerSecond] = useState(1);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    if (!token) {
      setBalance(null);
      setLastSync(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const response = await fetch(`${API_URL}/api/balance`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setBalance(data.total);
          setRatePerSecond(data.ratePerSecond);
          setLastSync(new Date());
        }
      } catch (error) {
        // Silent error handling
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [token]);

  // Reset state when logging out
  useEffect(() => {
    if (!token) {
      setBalance(null);
      setLastSync(null);
    }
  }, [token]);

  const updateBalance = async (newBalance: number) => {
    setBalance(newBalance);
  };

  const addToBalance = async (amount: number) => {
    setBalance(prev => prev !== null ? prev + amount : amount);
  };

  const subtractFromBalance = async (amount: number) => {
    if (balance === null || balance < amount) {
      throw new Error('Insufficient balance');
    }
    setBalance(prev => prev !== null ? prev - amount : 0);
  };

  return (
    <BalanceContext.Provider value={{
      balance,
      ratePerSecond,
      updateBalance,
      addToBalance,
      subtractFromBalance
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