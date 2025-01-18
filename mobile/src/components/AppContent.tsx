import React, { memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { TurfScreen } from '../screens/TurfScreen';

export const AppContent = memo(function AppContent() {
  const { token } = useAuth();
  
  return token ? <TurfScreen /> : <LoginScreen />;
}); 