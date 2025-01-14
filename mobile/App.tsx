/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {TurfScreen} from './src/screens/TurfScreen';
import {HomeScreen} from './src/screens/HomeScreen';
import {HackMapScreen} from './src/screens/HackMapScreen';
import {BotAssemblyScreen} from './src/screens/BotAssemblyScreen';
import { DigitalBarracksScreen } from './src/screens/DigitalBarracksScreen';
import { BalanceProvider } from './src/context/BalanceContext';
import { BotsProvider } from './src/context/BotsContext';

type ScreenProps = {
  onJackIn: () => void;
};

function LoginScreen({onJackIn}: ScreenProps): React.JSX.Element {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={onJackIn}>
        <Text style={styles.buttonText}>Jack In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.toggleText}>
          {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function App(): React.JSX.Element {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'turf' | 'home' | 'map' | 'botassembly' | 'barracks'>('turf');

  const handleNavigateToHackRig = () => {
    setCurrentScreen('home');
  };

  const handleNavigateToMap = () => {
    setCurrentScreen('map');
  };

  const handleNavigateToBotAssembly = () => {
    setCurrentScreen('botassembly');
  };

  const handleNavigateToBarracks = () => {
    setCurrentScreen('barracks');
  };

  const renderScreen = () => {
    if (!isLoggedIn) {
      return <LoginScreen onJackIn={() => setIsLoggedIn(true)} />;
    }
    
    switch (currentScreen) {
      case 'turf':
        return <TurfScreen 
          onNavigateToHackRig={handleNavigateToHackRig}
          onNavigateToBarracks={handleNavigateToBarracks}
        />;
      case 'home':
        return <HomeScreen 
          onNavigateToMap={handleNavigateToMap}
          onNavigateToBotAssembly={handleNavigateToBotAssembly}
          onClose={() => setCurrentScreen('turf')} 
        />;
      case 'map':
        return <HackMapScreen onClose={() => setCurrentScreen('home')} />;
      case 'botassembly':
        return <BotAssemblyScreen onClose={() => setCurrentScreen('home')} />;
      case 'barracks':
        return <DigitalBarracksScreen onClose={() => setCurrentScreen('turf')} />;
    }
  };

  return (
    <BalanceProvider>
      <BotsProvider>
        <SafeAreaView style={styles.container}>
          {renderScreen()}
        </SafeAreaView>
      </BotsProvider>
    </BalanceProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 50,
    backgroundColor: '#000',
  },
  button: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
  },
  input: {
    width: 300,
    height: 40,
    borderWidth: 1,
    borderColor: '#4a90e2',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    color: '#000',
  },
  toggleButton: {
    marginTop: 20,
  },
  toggleText: {
    color: '#4a90e2',
    fontSize: 14,
  },
});

export default App;
