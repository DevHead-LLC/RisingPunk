/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { SafeAreaView } from 'react-native';
import { TurfScreen } from './src/screens/TurfScreen';
import { BalanceProvider } from './src/context/BalanceContext';
import { BotsProvider } from './src/context/BotsContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

function AppContent(): React.JSX.Element {
  const { token } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BalanceProvider>
        <BotsProvider>
          {!token ? <LoginScreen /> : <TurfScreen />}
        </BotsProvider>
      </BalanceProvider>
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
