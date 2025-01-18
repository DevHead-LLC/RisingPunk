import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { BalanceProvider } from '../context/BalanceContext';
import { BotsProvider } from '../context/BotsContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BalanceProvider>
        <BotsProvider>
          {children}
        </BotsProvider>
      </BalanceProvider>
    </AuthProvider>
  );
} 