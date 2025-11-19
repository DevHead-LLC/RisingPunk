import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

interface LeaveCrewModalProps {
  visible: boolean;
  onClose: () => void;
  onLeave: () => Promise<void>;
}

export const LeaveCrewModal: React.FC<LeaveCrewModalProps> = ({
  visible,
  onClose,
  onLeave,
}) => {
  const colors = useThemeColors();
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');

  const handleLeave = async () => {
    setError('');
    setIsLeaving(true);
    try {
      await onLeave();
      setIsLeaving(false);
    } catch (error: any) {
      setError(error?.message || 'Failed to leave crew. Please try again.');
      setIsLeaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['landscape']}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>⚠️ LEAVE CREW</Text>
          
          <Text style={styles.warningText}>
            You are about to leave this crew. This action will remove you from the crew and you will need to reapply to join again.
            {'\n\n'}
            Are you sure you want to leave?
          </Text>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isLeaving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.leaveButton,
                isLeaving && styles.leaveButtonDisabled
              ]}
              onPress={handleLeave}
              disabled={isLeaving}
              activeOpacity={0.7}
            >
              {isLeaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.leaveButtonText}>LEAVE CREW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    minWidth: 400,
    maxWidth: 600,
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
    textAlign: 'left',
    marginBottom: SIZING.spacing.lg,
    lineHeight: SIZING.font.body + 4,
  },
  errorText: {
    color: colors.error,
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  leaveButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  leaveButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
});

