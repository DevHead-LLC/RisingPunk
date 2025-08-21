import React, {useState, useCallback, useEffect, useMemo, memo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SIZING, styleGuide} from '../styles/theme';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, registerUser, clearError } from '../store/slices/authSlice';
import { TitleSection } from '../components/auth/TitleSection';
import { AuthInputs } from '../components/auth/AuthInputs';
import { useFormState } from '../hooks/useFormState';
import { ScreenContainer } from '../components/common/ScreenContainer';
import { useThemeColors } from '../hooks/useThemeColors';

type FormType = 'login' | 'register';

const WelcomeMessage = memo(function WelcomeMessage({ formType }: { formType: FormType }) {
  const colors = useThemeColors();
  return (
    <Text style={[styles.welcomeText, { color: colors.secondary }]}>
      {formType === 'login' ? 'WELCOME BACK!' : 'WELCOME!'}
    </Text>
  );
});

const ToggleFormButton = memo(function ToggleFormButton({
  formType,
  onPress,
}: {
  formType: FormType;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity style={styles.toggleButton} onPress={onPress}>
      <Text style={[styles.toggleText, { color: colors.matrix }]}>
        {formType === 'login' ? 'NEW_IDENTITY (SIGN_UP)' : 'EXISTING_IDENTITY (SIGN_IN)'}
      </Text>
    </TouchableOpacity>
  );
});

const ErrorMessage = memo(function ErrorMessage({ error }: { error: string | null }) {
  if (!error) {return null;}
  const colors = useThemeColors();
  return <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>;
});

export const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const { isLoading: authLoading, error: authError } = useAppSelector((state) => state.auth);
  const [formType, setFormType] = useState<FormType>('login');
  const [formData, setFormData] = useState({
    email: '',
    handle: '',
    accessKey: '',
    verifyAccessKey: '',
  });
  const { isLoading: formLoading, error: formError, setLoading, setError, clearError: clearFormError } = useFormState();
  const colors = useThemeColors();

  // Combine loading states
  const isLoading = authLoading || formLoading;
  const error = authError || formError;

  // Clear auth error when form type changes
  useEffect(() => {
    if (authError) {
      dispatch(clearError());
    }
  }, [formType, authError, dispatch]);

  const handleInputChange = useCallback((field: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    clearFormError();

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
          setError('ACCESS_DENIED: KEY_TOO_SHORT');
          return false;
        }
        if (formData.accessKey !== formData.verifyAccessKey) {
          setError('ACCESS_DENIED: KEYS_DO_NOT_MATCH');
          return false;
        }
      }
      return true;
    };

    if (validateForm()) {
      try {
        setLoading(true);
        if (formType === 'login') {
          await dispatch(loginUser({
            handle: formData.handle,
            accessKey: formData.accessKey,
          })).unwrap();
        } else {
          await dispatch(registerUser({
            email: formData.email,
            handle: formData.handle,
            accessKey: formData.accessKey,
          })).unwrap();
        }
      } catch (err) {
        // Convert technical errors to user-friendly messages
        let userMessage = 'ACCESS_DENIED: ';

        if (err instanceof Error) {
          if (err.message.includes('Network error')) {
            userMessage += 'SERVER_UNAVAILABLE';
          } else if (err.message.includes('Server error')) {
            userMessage += 'SERVER_ERROR';
          } else if (err.message.includes('Invalid response')) {
            userMessage += 'INVALID_RESPONSE';
          } else {
            userMessage += err.message;
          }
        } else {
          userMessage += 'UNKNOWN_ERROR';
        }

        setError(userMessage);
      } finally {
        setLoading(false);
      }
    }
  }, [formType, formData, dispatch, clearFormError, setLoading, setError]);

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
    clearFormError();
    setFormData({ email: '', handle: '', accessKey: '', verifyAccessKey: '' });
  }, [clearFormError]);

  const renderLoginForm = () => {
    return (
      <View style={styles.formContainer}>
        <AuthInputs
          formType="login"
          formData={formData}
          handleInputChange={handleInputChange}
        />
        <TouchableOpacity
          style={[
            styles.jackInButton,
            { 
              backgroundColor: isSubmitDisabled ? colors.buttonDisabled : colors.buttonBg,
              zIndex: 999,
              elevation: 999,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
            },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
        >
          <Text style={[styles.jackInText, { color: '#FFFFFF' }]}>
            JACK_IN
          </Text>
          <View style={[styles.buttonCorner, { borderColor: colors.primary }]} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRegisterForm = () => (
    <View style={styles.formContainer}>
      <AuthInputs
        formType="register"
        formData={formData}
        handleInputChange={handleInputChange}
      />
      <TouchableOpacity
        style={[
          styles.jackInButton,
          { 
            backgroundColor: isSubmitDisabled ? colors.buttonDisabled : colors.buttonBg,
            zIndex: 999,
            elevation: 999,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          },
        ]}
        onPress={handleSubmit}
        disabled={isSubmitDisabled}
      >
        <Text style={[styles.jackInText, { color: '#FFFFFF' }]}>
          INITIALIZE
        </Text>
        <View style={[styles.buttonCorner, { borderColor: colors.primary }]} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.content}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: SIZING.screen.width * 0.9,
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
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
  formContainer: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: SIZING.spacing.md,
  },
  formBox: {
    width: '80%',
    borderRadius: 4,
    padding: SIZING.spacing.lg + SIZING.spacing.sm,
    borderLeftWidth: 2,
  },
  formHeader: {
    marginBottom: SIZING.spacing.lg,
  },
  formTitle: {
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
  },
  jackInButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZING.spacing.sm,
    position: 'relative',
  },
  buttonCorner: {
    ...styleGuide.cornerDecoration,
  },
  jackInText: {
    fontSize: SIZING.font.body + 2,
    fontWeight: '500',
    letterSpacing: 1,
  },
  toggleButton: {
    marginTop: SIZING.spacing.md,
    opacity: 0.7,
  },
  toggleText: {
    fontSize: SIZING.font.small,
    letterSpacing: 1,
  },
  inputSpacing: {
    marginBottom: SIZING.spacing.md,
  },
  createButton: {
    marginTop: SIZING.spacing.xs,
  },
  welcomeText: {
    fontSize: SIZING.font.h2 - 2,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  errorText: {
    color: '#ff4444',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
});
