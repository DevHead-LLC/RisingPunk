import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { sharedModalFormStyles } from '../../styles/modalFormStyles';
import { useChangePasswordMutation } from '../../store/api/authApi';

interface ChangePasswordModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isVisible,
  onClose,
}) => {
  const colors = useThemeColors();
  const [currentAccessKey, setCurrentAccessKey] = useState('');
  const [newAccessKey, setNewAccessKey] = useState('');
  const [verifyNewAccessKey, setVerifyNewAccessKey] = useState('');
  const [changePassword, { isLoading: isSubmitting }] = useChangePasswordMutation();

  const handleSubmit = useCallback(async () => {
    if (!currentAccessKey) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    if (!newAccessKey || newAccessKey.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }
    if (newAccessKey !== verifyNewAccessKey) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      await changePassword({
        currentAccessKey,
        newAccessKey,
        verifyNewAccessKey,
      }).unwrap();
      Alert.alert('Password Updated', 'Your password has been changed.', [
        { text: 'OK', onPress: () => {
          setCurrentAccessKey('');
          setNewAccessKey('');
          setVerifyNewAccessKey('');
          onClose();
        }},
      ]);
    } catch (error: any) {
      const msg = error?.data?.error ?? error?.message ?? 'Failed to change password';
      Alert.alert('Error', msg);
    }
  }, [currentAccessKey, newAccessKey, verifyNewAccessKey, changePassword, onClose]);

  const handleClose = useCallback(() => {
    setCurrentAccessKey('');
    setNewAccessKey('');
    setVerifyNewAccessKey('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['landscape-left', 'landscape-right']}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.matrix }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.primary }]}>CHANGE PASSWORD</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: colors.matrix }]}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.matrix, color: colors.primary }]}
              placeholder="CURRENT_PASSWORD"
              placeholderTextColor={colors.matrix}
              value={currentAccessKey}
              onChangeText={setCurrentAccessKey}
              secureTextEntry
              editable={!isSubmitting}
            />
            <View style={[styles.inputCorner, { borderColor: colors.matrix }]} />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.matrix, color: colors.primary }]}
              placeholder="NEW_PASSWORD (MIN 6)"
              placeholderTextColor={colors.matrix}
              value={newAccessKey}
              onChangeText={setNewAccessKey}
              secureTextEntry
              editable={!isSubmitting}
            />
            <View style={[styles.inputCorner, { borderColor: colors.matrix }]} />
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.matrix, color: colors.primary }]}
              placeholder="VERIFY_NEW_PASSWORD"
              placeholderTextColor={colors.matrix}
              value={verifyNewAccessKey}
              onChangeText={setVerifyNewAccessKey}
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
              <Text style={[styles.submitText, { color: '#FFFFFF' }]}>{isSubmitting ? 'UPDATING...' : 'UPDATE_PASSWORD'}</Text>
              <View style={[styles.buttonCorner, { borderColor: colors.primary }]} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.matrix }]} onPress={handleClose} disabled={isSubmitting}>
              <Text style={[styles.cancelText, { color: colors.matrix }]}>CANCEL</Text>
              <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  ...sharedModalFormStyles,
});
