import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

const VALID_CHAR_REGEX = /^[a-zA-Z0-9_-]*$/;

interface EditCrewNameModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (crewName: string) => Promise<void>;
  currentCrewName: string;
}

export const EditCrewNameModal: React.FC<EditCrewNameModalProps> = ({
  visible,
  onClose,
  onUpdate,
  currentCrewName,
}) => {
  const colors = useThemeColors();
  const [crewName, setCrewName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setCrewName(currentCrewName);
      setError('');
    }
  }, [visible, currentCrewName]);

  const validateCrewName = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'Crew name is required';
    }
    if (value.length > 12) {
      return 'Crew name must be 12 characters or less';
    }
    if (!VALID_CHAR_REGEX.test(value)) {
      return 'Only letters, numbers, _, and - are allowed';
    }
    return '';
  }, []);

  const handleCrewNameChange = useCallback((text: string) => {
    const filtered = text.replace(/[^a-zA-Z0-9_-]/g, '');
    setCrewName(filtered);
    setError('');
  }, []);

  const handleUpdate = async () => {
    const nameError = validateCrewName(crewName);
    
    if (nameError) {
      setError(nameError);
      return;
    }

    const normalizedName = crewName.trim();
    if (normalizedName === currentCrewName.trim()) {
      onClose();
      return;
    }

    setError('');
    setIsUpdating(true);
    try {
      await onUpdate(normalizedName);
    } catch (error: any) {
      setError(error?.message || error?.data?.error || 'Failed to update crew name. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setCrewName('');
    setError('');
    onClose();
  };

  const styles = createStyles(colors);
  const nameError = validateCrewName(crewName);
  const isFormValid = !nameError && crewName.trim() && crewName.trim() !== currentCrewName.trim();

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
          <Text style={styles.title}>EDIT CREW NAME</Text>
          
          <Text style={styles.descriptionText}>
            Update your crew name. Crew names must be unique and can contain up to 12 characters (letters, numbers, _, and -).
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Crew Name (Maximum 12 characters)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: (error || nameError) ? colors.error : colors.secondary,
                  backgroundColor: colors.inputBg || colors.surface,
                  color: colors.text.primary,
                }
              ]}
              value={crewName}
              onChangeText={handleCrewNameChange}
              placeholder="Enter crew name..."
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={12}
              editable={!isUpdating}
            />
            {(error || nameError) ? (
              <Text style={styles.errorText}>{error || nameError}</Text>
            ) : null}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isUpdating}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.updateButton,
                (!isFormValid || isUpdating) && styles.updateButtonDisabled
              ]}
              onPress={handleUpdate}
              disabled={!isFormValid || isUpdating}
              activeOpacity={0.7}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.updateButtonText}>UPDATE NAME</Text>
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
    borderColor: colors.secondary,
    minWidth: 400,
    maxWidth: 600,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  descriptionText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'left',
    marginBottom: SIZING.spacing.lg,
    lineHeight: SIZING.font.body + 4,
  },
  inputContainer: {
    marginBottom: SIZING.spacing.lg,
  },
  inputLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    fontSize: SIZING.font.body,
  },
  errorText: {
    color: colors.error,
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
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
  updateButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  updateButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
});

