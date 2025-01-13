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
import {HackRigScreen} from './src/screens/HackRigScreen';

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
  const [currentScreen, setCurrentScreen] = useState<'turf' | 'hackrig'>('turf');

  const handleNavigateToHackRig = () => {
    setCurrentScreen('hackrig');
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isLoggedIn ? (
        <LoginScreen onJackIn={() => setIsLoggedIn(true)} />
      ) : (
        currentScreen === 'turf' ? (
          <TurfScreen onNavigateToHackRig={handleNavigateToHackRig} />
        ) : (
          <HackRigScreen />
        )
      )}
    </SafeAreaView>
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
