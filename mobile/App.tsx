import React from 'react';
import { View } from 'react-native';
import { COLORS } from './src/styles/theme';
import { TurfScreen } from './src/screens/TurfScreen';
import { BalanceProvider } from './src/context/BalanceContext';
import { BotsProvider } from './src/context/BotsContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

function AppContent(): React.JSX.Element {
  const { token } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <BalanceProvider>
        <BotsProvider>
          {!token ? <LoginScreen /> : <TurfScreen />}
        </BotsProvider>
      </BalanceProvider>
    </View>
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
