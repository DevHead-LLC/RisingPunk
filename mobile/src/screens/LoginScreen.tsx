import React, {useState, useCallback, useEffect, useMemo, memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import {COLORS, SIZING, styleGuide} from '../styles/theme';
import {useAuth} from '../context/AuthContext';
import {api} from '../services/api';
import { TitleSection } from '../components/auth/TitleSection';
import { useDebounce } from '../hooks/useDebounce';
import { useFormState } from '../hooks/useFormState';
import { ScreenContainer } from '../components/common/ScreenContainer';

type FormType = 'login' | 'register';

const WelcomeMessage = memo(function WelcomeMessage({ formType }: { formType: FormType }) {
  return (
    <Text style={styles.welcomeText}>
      {formType === 'login' ? 'WELCOME BACK!' : 'WELCOME!'}
    </Text>
  );
});

const ToggleFormButton = memo(function ToggleFormButton({ 
  formType, 
  onPress 
}: { 
  formType: FormType;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleButton} onPress={onPress}>
      <Text style={styles.toggleText}>
        {formType === 'login' ? 'NEW_IDENTITY (SIGN_UP)' : 'EXISTING_IDENTITY (SIGN_IN)'}
      </Text>
    </TouchableOpacity>
  );
});

const ErrorMessage = memo(function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;
  return <Text style={styles.errorText}>{error}</Text>;
});

export const LoginScreen = () => {
  const { login } = useAuth();
  const [formType, setFormType] = useState<FormType>('login');
  const [formData, setFormData] = useState({
    email: '',
    handle: '',
    accessKey: '',
    verifyAccessKey: '',
  });
  const { isLoading, error, setLoading, setError, clearError } = useFormState();
  const debouncedFormData = useDebounce(formData);

  useEffect(() => {
    if (debouncedFormData !== formData) {
      validateForm();
    }
  }, [debouncedFormData]);

  const validateForm = () => {
    setError('');
    
    if (formType === 'login') {
      if (!formData.handle || !formData.accessKey) {
        setError('ACCESS_DENIED: CREDENTIALS_REQUIRED');
        return false;
      }
    } else {
      if (!formData.email || !formData.handle || !formData.accessKey || !formData.verifyAccessKey) {
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
      if (formData.accessKey !== formData.verifyAccessKey) {
        setError('ACCESS_DENIED: ACCESS_KEYS_DO_NOT_MATCH');
        return false;
      }
    }
    return true;
  };

  const handleInputChange = useCallback((field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    clearError();
    if (validateForm()) {
      try {
        setLoading(true);
        if (formType === 'login') {
          const response = await api.login({
            handle: formData.handle,
            accessKey: formData.accessKey,
          });
          await login(response.token, response.user);
        } else {
          const response = await api.register({
            email: formData.email,
            handle: formData.handle,
            accessKey: formData.accessKey,
          });
          await login(response.token, response.user);
        }
      } catch (err) {
        setError(`ACCESS_DENIED: ${err instanceof Error ? err.message : 'UNKNOWN_ERROR'}`);
      } finally {
        setLoading(false);
      }
    }
  }, [formType, formData, validateForm, login, clearError, setLoading, setError]);

  const isFormValid = useMemo(() => {
    if (formType === 'login') {
      return formData.handle.trim().length > 0 && formData.accessKey.trim().length > 0;
    }
    return formData.email.trim().length > 0 && 
           formData.handle.trim().length > 0 && 
           formData.accessKey.trim().length > 0 && 
           formData.verifyAccessKey.trim().length > 0;
  }, [formType, formData]);

  // Update button disabled state
  const isSubmitDisabled = isLoading || !isFormValid;

  const toggleFormType = useCallback(() => {
    setFormType(prev => prev === 'login' ? 'register' : 'login');
    setError('');
    setFormData({ email: '', handle: '', accessKey: '', verifyAccessKey: '' });
  }, []);

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
      <TouchableOpacity 
        style={[
          styles.jackInButton, 
          isSubmitDisabled && styles.buttonDisabled
        ]} 
        onPress={handleSubmit}
        disabled={isSubmitDisabled}
      >
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
      {renderInputWithCorner('VERIFY_ACCESS_KEY', formData.verifyAccessKey, handleInputChange('verifyAccessKey'), true)}
      <TouchableOpacity 
        style={[
          styles.jackInButton, 
          styles.createButton,
          isSubmitDisabled && styles.buttonDisabled
        ]} 
        onPress={handleSubmit}
        disabled={isSubmitDisabled}
      >
        <Text style={styles.jackInText}>INITIALIZE</Text>
        <View style={styles.buttonCorner} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.leftSide}>
          <TitleSection />
        </View>
        <View style={styles.rightSide}>
          <WelcomeMessage formType={formType} />
          <ErrorMessage error={error} />
          {formType === 'login' ? renderLoginForm() : renderRegisterForm()}
          <ToggleFormButton formType={formType} onPress={toggleFormType} />
        </View>
      </View>
    </ScreenContainer>
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
  buttonDisabled: {
    backgroundColor: COLORS.buttonDisabled,
  },
}); 