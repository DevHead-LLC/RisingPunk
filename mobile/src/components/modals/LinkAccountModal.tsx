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
import { SIZING } from '../../styles/theme';
import { sharedModalFormStyles } from '../../styles/modalFormStyles';
import { useLinkAccountMutation } from '../../store/api/authApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { refreshUserData } from '../../store/slices/authSlice';
import { logAccountCreatedOnce } from '../../services/analyticsService';

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
  const user = useAppSelector((state) => state.auth.user);
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
      // Same Mongo user as guest — logAccountCreatedOnce dedupes if guest already emitted account_created.
      if (!user?._id) {
        throw new Error('Link account succeeded but user id is missing');
      }
      await logAccountCreatedOnce({ userId: user._id, method: 'guest_link' });
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
  }, [email, accessKey, verifyAccessKey, linkAccount, dispatch, onClose, user?._id]);

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
  ...sharedModalFormStyles,
  overlay: { ...sharedModalFormStyles.overlay, backgroundColor: 'rgba(0, 0, 0, 0.85)' },
  scrollView: { flexGrow: 0 },
  scrollContent: { paddingBottom: SIZING.spacing.lg, flexGrow: 1 },
});
