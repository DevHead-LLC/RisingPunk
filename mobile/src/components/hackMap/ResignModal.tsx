import React, { useState, useEffect } from 'react';
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

interface ResignModalProps {
  visible: boolean;
  onClose: () => void;
  onResign: () => Promise<void>;
}

export const ResignModal: React.FC<ResignModalProps> = ({
  visible,
  onClose,
  onResign,
}) => {
  const colors = useThemeColors();
  const [isResigning, setIsResigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setError('');
      setIsResigning(false);
    }
  }, [visible]);

  const handleResign = async () => {
    setError('');
    setIsResigning(true);
    try {
      await onResign();
    } catch (error: any) {
      setError(error?.message || error?.data?.error || 'Failed to resign. Please try again.');
    } finally {
      setIsResigning(false);
    }
  };

  const handleClose = () => {
    setError('');
    setIsResigning(false);
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
          <Text style={styles.title}>⚠️ RESIGN AS PRESIDENT</Text>
          
          <Text style={styles.warningText}>
            You are about to resign from your position as president. Leadership will be automatically transferred to the next in line:
            {'\n\n'}
            • First priority: Highest level executive
            {'\n'}
            • Second priority: Highest level member (if no executives available)
            {'\n\n'}
            You will become a regular member of the crew. This action cannot be undone.
          </Text>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isResigning}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.resignButton,
                isResigning && styles.resignButtonDisabled
              ]}
              onPress={handleResign}
              disabled={isResigning}
              activeOpacity={0.7}
            >
              {isResigning ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.resignButtonText}>CONFIRM RESIGN</Text>
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
  resignButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  resignButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  resignButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
});

