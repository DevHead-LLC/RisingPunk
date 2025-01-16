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

type FormType = 'login' | 'register';

export function LoginScreen({onJackIn}: LoginScreenProps): React.JSX.Element {
  const [formType, setFormType] = useState<FormType>('login');
  const [formData, setFormData] = useState({
    email: '',
    handle: '',
    accessKey: '',
  });
  const [error, setError] = useState<string>('');

  const validateForm = () => {
    setError('');
    
    if (formType === 'login') {
      if (!formData.handle || !formData.accessKey) {
        setError('ACCESS_DENIED: CREDENTIALS_REQUIRED');
        return false;
      }
    } else {
      if (!formData.email || !formData.handle || !formData.accessKey) {
        setError('ACCESS_DENIED: ALL_FIELDS_REQUIRED');
        return false;
      }
      if (!formData.email.includes('@')) {
        setError('ACCESS_DENIED: INVALID_EMAIL');
        return false;
      }
      if (formData.accessKey.length < 6) {
        setError('ACCESS_DENIED: ACCESS_KEY_TOO_SHORT');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onJackIn();
    }
  };

  const handleInputChange = (field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderWelcomeMessage = () => (
    <Text style={styles.welcomeText}>
      {formType === 'login' ? 'WELCOME BACK!' : 'WELCOME!'}
    </Text>
  );

  const renderInputWithCorner = (
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    secureTextEntry?: boolean,
    keyboardType?: 'email-address' | 'default'
  ) => (
    <View style={styles.inputWrapper}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.text.placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      <View style={styles.inputCorner} />
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.formContainer}>
      {renderInputWithCorner('HANDLE', formData.handle, handleInputChange('handle'))}
      {renderInputWithCorner('ACCESS_KEY', formData.accessKey, handleInputChange('accessKey'), true)}
      <TouchableOpacity style={styles.jackInButton} onPress={handleSubmit}>
        <Text style={styles.jackInText}>JACK_IN</Text>
        <View style={styles.buttonCorner} />
      </TouchableOpacity>
    </View>
  );

  const renderRegisterForm = () => (
    <View style={styles.formContainer}>
      {renderInputWithCorner('ENTER_EMAIL', formData.email, handleInputChange('email'), false, 'email-address')}
      {renderInputWithCorner('SELECT_HANDLE', formData.handle, handleInputChange('handle'))}
      {renderInputWithCorner('SET_ACCESS_KEY', formData.accessKey, handleInputChange('accessKey'), true)}
      <TouchableOpacity 
        style={[styles.jackInButton, styles.createButton]} 
        onPress={handleSubmit}
      >
        <Text style={styles.jackInText}>INITIALIZE</Text>
        <View style={styles.buttonCorner} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
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
      <View style={styles.rightSide}>
        {renderWelcomeMessage()}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {formType === 'login' ? renderLoginForm() : renderRegisterForm()}
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => {
            setFormType(prev => prev === 'login' ? 'register' : 'login');
            setError('');
            setFormData({ email: '', handle: '', accessKey: '' });
          }}
        >
          <Text style={styles.toggleText}>
            {formType === 'login' ? 'NEW_IDENTITY (SIGN_UP)' : 'EXISTING_IDENTITY (SIGN_IN)'}
          </Text>
        </TouchableOpacity>
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
    marginBottom: SIZING.spacing.sm,
    width: '100%',
  },
  input: {
    ...styleGuide.inputField,
    height: 42,
  },
  inputCorner: {
    ...styleGuide.cornerDecoration,
    borderColor: COLORS.primary,
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
    marginTop: SIZING.spacing.md,
    opacity: 0.7,
  },
  toggleText: {
    color: COLORS.matrix,
    fontSize: SIZING.font.small,
    letterSpacing: 1,
  },
  formContainer: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: SIZING.spacing.md,
  },
  inputSpacing: {
    marginBottom: SIZING.spacing.md,
  },
  createButton: {
    marginTop: SIZING.spacing.xs,
  },
  welcomeText: {
    color: COLORS.secondary,
    fontSize: SIZING.font.h2 - 2,
    fontWeight: '500',
    marginBottom: SIZING.spacing.md,
    letterSpacing: 2,
    opacity: 0.8,
  },
  errorText: {
    color: '#FF0033',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.sm,
    letterSpacing: 1,
  },
}); 