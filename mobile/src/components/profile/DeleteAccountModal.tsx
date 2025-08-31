import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onDelete: (handle: string) => Promise<void>;
  userHandle: string;
}

export function DeleteAccountModal({ visible, onClose, onDelete, userHandle }: DeleteAccountModalProps) {
  const colors = useThemeColors();
  const [handleInput, setHandleInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (handleInput !== userHandle) {
      Alert.alert('Verification Failed', 'Please enter your exact username/handle to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(handleInput);
    } catch (error) {
      Alert.alert('Deletion Failed', 'There was an error deleting your account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.background + 'CC',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: SIZING.spacing.lg,
      margin: SIZING.spacing.lg,
      borderWidth: 2,
      borderColor: colors.error,
      minWidth: 300,
      maxWidth: 400,
    },
    title: {
      color: colors.error,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: SIZING.spacing.md,
    },
    warningText: {
      color: colors.text.primary,
      fontSize: SIZING.font.body,
      textAlign: 'center',
      marginBottom: SIZING.spacing.lg,
      lineHeight: SIZING.font.body + 4,
    },
    inputContainer: {
      marginBottom: SIZING.spacing.lg,
    },
    inputLabel: {
      color: colors.text.primary,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
      marginBottom: SIZING.spacing.sm,
      textAlign: 'center',
    },
    input: {
      borderWidth: 2,
      borderColor: colors.error + '66',
      borderRadius: 8,
      padding: SIZING.spacing.md,
      color: colors.text.primary,
      fontSize: SIZING.font.body,
      textAlign: 'center',
      backgroundColor: colors.background + '33',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: SIZING.spacing.md,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: colors.background + '66',
      borderWidth: 2,
      borderColor: colors.text.secondary,
      borderRadius: 8,
      paddingVertical: SIZING.spacing.md,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    deleteButton: {
      flex: 1,
      backgroundColor: colors.error,
      borderWidth: 2,
      borderColor: colors.error,
      borderRadius: 8,
      paddingVertical: SIZING.spacing.md,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: colors.background,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    deleteButtonDisabled: {
      backgroundColor: colors.error + '66',
      borderColor: colors.error + '66',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>⚠️ DELETE ACCOUNT</Text>
          
          <Text style={styles.warningText}>
            This action is irreversible. Your account will be permanently deleted immediately.
            {'\n\n'}
            After 5 days, our backup system will purge all remaining data to comply with our Privacy Policy.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Type your username to confirm: <Text style={{ color: colors.error }}>{userHandle}</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={handleInput}
              onChangeText={setHandleInput}
              placeholder="Enter username"
              placeholderTextColor={colors.text.secondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (isDeleting || handleInput !== userHandle) && styles.deleteButtonDisabled
              ]}
              onPress={handleDelete}
              disabled={isDeleting || handleInput !== userHandle}
            >
              {isDeleting ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={styles.deleteButtonText}>DELETE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
