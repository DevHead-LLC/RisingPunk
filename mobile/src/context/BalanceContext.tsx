import React, { createContext, useContext, useState, useEffect } from 'react';

type BalanceContextType = {
  balance: number;
  updateBalance: (newBalance: number) => void;
  addToBalance: (amount: number) => void;
  subtractFromBalance: (amount: number) => void;
};

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState(1000);

  useEffect(() => {
    const INCOME_RATE = 10; // $10 every 10 seconds = $1/second
    const INCOME_INTERVAL = 10000; // 10 seconds

    const incomeTimer = setInterval(() => {
      setBalance(prev => prev + INCOME_RATE);
    }, INCOME_INTERVAL);

    return () => clearInterval(incomeTimer);
  }, []);

  const updateBalance = (newBalance: number) => {
    setBalance(newBalance);
  };

  const addToBalance = (amount: number) => {
    setBalance(prev => prev + amount);
  };

  const subtractFromBalance = (amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  };

  return (
    <BalanceContext.Provider value={{ 
      balance, 
      updateBalance, 
      addToBalance, 
      subtractFromBalance 
    }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
} 