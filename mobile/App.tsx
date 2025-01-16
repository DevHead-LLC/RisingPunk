/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {SafeAreaView} from 'react-native';
import {TurfScreen} from './src/screens/TurfScreen';
import {BalanceProvider} from './src/context/BalanceContext';
import {BotsProvider} from './src/context/BotsContext';
import {LoginScreen} from './src/screens/LoginScreen';
import {AuthProvider, useAuth} from './src/context/AuthContext';

function AppContent(): React.JSX.Element {
  const {token} = useAuth();

  return (
    <SafeAreaView style={{flex: 1}}>
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
