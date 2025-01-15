import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import {COLORS, SIZING, styleGuide} from '../styles/theme';

type LoginScreenProps = {
  onJackIn: () => void;
};

export function LoginScreen({onJackIn}: LoginScreenProps): React.JSX.Element {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      {/* Left Side */}
      <View style={styles.leftSide}>
        <View style={styles.titleContainer}>
          <View style={styles.titleWrapper}>
            <Text style={styles.titleTop}>Ri</Text>
            <Text style={styles.dollarSign}>$</Text>
            <Text style={styles.titleTop}>ing</Text>
          </View>
          <Text style={styles.titleBottom}>Punk</Text>
          <View style={styles.taglineContainer}>
            <Text style={styles.taglineText}>
              Earn money... or be a <Text style={styles.punkText}>Punk?!</Text>
            </Text>
          </View>
        </View>
        <Text style={styles.versionText}>ALPHA_0.1.0</Text>
      </View>

      {/* Right Side - Login Form */}
      <View style={styles.rightSide}>
        <View style={styles.formBox}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {isSignUp ? '// New User' : '// Login'}
            </Text>
          </View>
          
          <View style={styles.inputsContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="HANDLE"
                placeholderTextColor={COLORS.text.placeholder}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <View style={styles.inputCorner} />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="ACCESS_KEY"
                placeholderTextColor={COLORS.text.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <View style={styles.inputCorner} />
            </View>

            <TouchableOpacity 
              style={styles.jackInButton} 
              onPress={onJackIn}
              activeOpacity={0.8}
            >
              <Text style={styles.jackInText}>JACK_IN</Text>
              <View style={styles.buttonCorner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.toggleText}>
                {isSignUp ? '[ return_to_login ]' : '[ create_account ]'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },
  leftSide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: '5%',
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleTop: {
    fontSize: SIZING.font.h1,
    color: COLORS.primary,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  dollarSign: {
    fontSize: SIZING.font.h1 - 16,
    color: COLORS.matrix,
    fontWeight: 'bold',
    marginTop: SIZING.spacing.sm,
    ...styleGuide.matrixGlow,
  },
  titleBottom: {
    fontSize: SIZING.font.h1,
    color: COLORS.secondary,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: -15,
  },
  taglineContainer: {
    marginTop: SIZING.spacing.sm,
    marginLeft: SIZING.spacing.xs,
  },
  taglineText: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.body,
    opacity: 0.8,
  },
  punkText: {
    color: COLORS.matrix,
    fontWeight: '600',
  },
  versionText: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.small,
    opacity: 0.7,
    position: 'absolute',
    bottom: '5%',
    left: '5%',
  },
  rightSide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: '5%',
  },
  formBox: {
    width: '80%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    padding: SIZING.spacing.lg + SIZING.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.primary,
  },
  formHeader: {
    marginBottom: SIZING.spacing.lg,
  },
  formTitle: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: '500',
  },
  inputsContainer: {
    gap: SIZING.spacing.md,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    ...styleGuide.inputField,
  },
  inputCorner: {
    ...styleGuide.cornerDecoration,
  },
  jackInButton: {
    height: 48,
    backgroundColor: COLORS.buttonBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZING.spacing.sm,
    position: 'relative',
  },
  buttonCorner: {
    ...styleGuide.cornerDecoration,
  },
  jackInText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body + 2,
    fontWeight: '500',
    letterSpacing: 1,
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: SIZING.spacing.md,
  },
  toggleText: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.small,
  },
}); 