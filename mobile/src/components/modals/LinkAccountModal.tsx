import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING, styleGuide } from '../../styles/theme';
import { useLinkAccountMutation } from '../../store/api/authApi';
import { useAppDispatch } from '../../store/hooks';
import { refreshUserData } from '../../store/slices/authSlice';

interface LinkAccountModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const LinkAccountModal: React.FC<LinkAccountModalProps> = ({
  isVisible,
  onClose,
}) => {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [verifyAccessKey, setVerifyAccessKey] = useState('');
  const [linkAccount, { isLoading: isSubmitting }] = useLinkAccountMutation();

  const handleSubmit = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    if (!accessKey || accessKey.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (accessKey !== verifyAccessKey) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await linkAccount({ email: trimmedEmail, accessKey }).unwrap();
      Alert.alert('Account Linked', 'Your email and password have been set. You can now sign in from other devices.', [
        { text: 'OK', onPress: () => {
          dispatch(refreshUserData());
          setEmail('');
          setAccessKey('');
          setVerifyAccessKey('');
          onClose();
        }},
      ]);
    } catch (error: any) {
      const msg = error?.data?.error ?? error?.message ?? 'Failed to link account';
      Alert.alert('Error', msg);
    }
  }, [email, accessKey, verifyAccessKey, linkAccount, dispatch, onClose]);

  const handleClose = useCallback(() => {
    setEmail('');
    setAccessKey('');
    setVerifyAccessKey('');
    onClose();
  }, [onClose]);

  const { height: windowHeight } = Dimensions.get('window');
  const maxModalHeight = windowHeight * 0.88;
  const modalContentMaxHeight = windowHeight * 0.55;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
      supportedOrientations={['landscape-left', 'landscape-right']}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.matrix, maxHeight: maxModalHeight }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>LINK EMAIL & PASSWORD</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.matrix }]}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={[styles.scrollView, { maxHeight: modalContentMaxHeight }]}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.content}>
              <Text style={[styles.description, { color: colors.secondary }]}>
                Set an email and password to sign in from other devices.
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.matrix, color: colors.text?.primary ?? colors.primary }]}
                  placeholder="Email"
                  placeholderTextColor={colors.matrix}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSubmitting}
                />
                <View style={[styles.inputCorner, { borderColor: colors.matrix }]} />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.matrix, color: colors.text?.primary ?? colors.primary }]}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={colors.matrix}
                  value={accessKey}
                  onChangeText={setAccessKey}
                  secureTextEntry
                  editable={!isSubmitting}
                />
                <View style={[styles.inputCorner, { borderColor: colors.matrix }]} />
              </View>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.matrix, color: colors.text?.primary ?? colors.primary }]}
                  placeholder="Verify password"
                  placeholderTextColor={colors.matrix}
                  value={verifyAccessKey}
                  onChangeText={setVerifyAccessKey}
                  secureTextEntry
                  editable={!isSubmitting}
                />
                <View style={[styles.inputCorner, { borderColor: colors.matrix }]} />
              </View>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: isSubmitting ? colors.buttonDisabled : colors.buttonBg, borderColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.submitText, { color: '#FFFFFF' }]}>{isSubmitting ? 'Linking…' : 'Link account'}</Text>
                  <View style={[styles.buttonCorner, { borderColor: colors.primary }]} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.matrix }]} onPress={handleClose} disabled={isSubmitting}>
                  <Text style={[styles.cancelText, { color: colors.matrix }]}>Cancel</Text>
                  <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 8,
    borderWidth: 2,
    padding: 0,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: SIZING.spacing.lg,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: { fontSize: SIZING.font.h2, fontWeight: '600', letterSpacing: 1 },
  closeButton: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 24, fontWeight: 'bold' },
  content: { padding: SIZING.spacing.lg },
  description: { fontSize: SIZING.font.body, lineHeight: 20, marginBottom: SIZING.spacing.lg, textAlign: 'center' },
  inputContainer: { position: 'relative', marginBottom: SIZING.spacing.md },
  input: { ...styleGuide.inputField, height: 48, paddingHorizontal: SIZING.spacing.md, borderWidth: 2, borderRadius: 4 },
  inputCorner: { ...styleGuide.cornerDecoration },
  buttonContainer: { gap: SIZING.spacing.md },
  submitButton: { height: 48, justifyContent: 'center', alignItems: 'center', position: 'relative', borderWidth: 2, borderRadius: 4 },
  submitText: { fontSize: SIZING.font.body, fontWeight: '600', letterSpacing: 1 },
  cancelButton: { height: 48, justifyContent: 'center', alignItems: 'center', position: 'relative', borderWidth: 2, borderRadius: 4, backgroundColor: 'transparent' },
  cancelText: { fontSize: SIZING.font.body, fontWeight: '600', letterSpacing: 1 },
  buttonCorner: { ...styleGuide.cornerDecoration },
});
