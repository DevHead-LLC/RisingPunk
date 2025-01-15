/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from 'react';
import {SafeAreaView} from 'react-native';
import {TurfScreen} from './src/screens/TurfScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {HackMapScreen} from './src/screens/HackMapScreen';
import {BotAssemblyScreen} from './src/screens/BotAssemblyScreen';
import {DigitalBarracksScreen} from './src/screens/DigitalBarracksScreen';
import {BalanceProvider} from './src/context/BalanceContext';
import {BotsProvider} from './src/context/BotsContext';
import {ProfileScreen} from './src/screens/ProfileScreen';
import {LoginScreen} from './src/screens/LoginScreen';

function App(): React.JSX.Element {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleJackIn = () => {
    setIsLoggedIn(true);
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <BalanceProvider>
        <BotsProvider>
          {!isLoggedIn ? (
            <LoginScreen onJackIn={handleJackIn} />
          ) : (
            <TurfScreen />
          )}
        </BotsProvider>
      </BalanceProvider>
    </SafeAreaView>
  );
}

export default App;
