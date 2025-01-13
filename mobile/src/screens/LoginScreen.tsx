import React, {useState} from 'react';
import {View, Text} from 'react-native';
import {styles} from '../styles/globalStyles';
import {CustomInput} from '../components/common/CustomInput';
import {CustomButton} from '../components/common/CustomButton';

type LoginScreenProps = {
  onJackIn: () => void;
};

export function LoginScreen({onJackIn}: LoginScreenProps): React.JSX.Element {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
      
      <CustomInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <CustomInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <CustomButton 
        title="Jack In"
        onPress={onJackIn}
      />
      
      <CustomButton
        title={isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
        variant="secondary"
        onPress={() => setIsSignUp(!isSignUp)}
      />
    </View>
  );
} 