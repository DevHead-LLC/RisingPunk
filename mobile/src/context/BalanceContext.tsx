import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../services/api';

type BalanceContextType = {
  balance: number | null;
  ratePerSecond: number;
  updateBalance: (newBalance: number) => void;
  addToBalance: (amount: number) => void;
  subtractFromBalance: (amount: number) => void;
};

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [ratePerSecond, setRatePerSecond] = useState(1);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Fetch initial balance and set up polling
  useEffect(() => {
    if (!token) {
      setBalance(null);
      setLastSync(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        const response = await fetch(`${API_URL}/balance`, {
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
        console.error('Balance fetch error:', error);
      }
    };

    // Initial fetch
    fetchBalance();

    // Poll every 10 seconds
    const interval = setInterval(fetchBalance, 10000);

    // Local updates every second for smooth UI
    const localInterval = setInterval(() => {
      setBalance(prev => prev !== null ? prev + ratePerSecond : prev);
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(localInterval);
    };
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