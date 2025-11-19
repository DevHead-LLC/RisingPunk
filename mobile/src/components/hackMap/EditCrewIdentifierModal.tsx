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

interface EditCrewIdentifierModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (crewIdentifier: string) => Promise<void>;
  currentCrewIdentifier: string;
}

export const EditCrewIdentifierModal: React.FC<EditCrewIdentifierModalProps> = ({
  visible,
  onClose,
  onUpdate,
  currentCrewIdentifier,
}) => {
  const colors = useThemeColors();
  const [crewIdentifier, setCrewIdentifier] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setCrewIdentifier(currentCrewIdentifier);
      setError('');
    }
  }, [visible, currentCrewIdentifier]);

  const validateCrewIdentifier = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'Crew identifier is required';
    }
    if (value.length > 5) {
      return 'Crew identifier must be 5 characters or less';
    }
    if (!VALID_CHAR_REGEX.test(value)) {
      return 'Only letters, numbers, _, and - are allowed';
    }
    return '';
  }, []);

  const handleCrewIdentifierChange = useCallback((text: string) => {
    const filtered = text.replace(/[^a-zA-Z0-9_-]/g, '');
    const uppercased = filtered.toUpperCase();
    setCrewIdentifier(uppercased);
    setError('');
  }, []);

  const handleUpdate = async () => {
    const identifierError = validateCrewIdentifier(crewIdentifier);
    
    if (identifierError) {
      setError(identifierError);
      return;
    }

    const normalizedIdentifier = crewIdentifier.trim().toUpperCase();
    if (normalizedIdentifier === currentCrewIdentifier.trim().toUpperCase()) {
      onClose();
      return;
    }

    setError('');
    setIsUpdating(true);
    try {
      await onUpdate(normalizedIdentifier);
    } catch (error: any) {
      setError(error?.message || error?.data?.error || 'Failed to update crew identifier. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setCrewIdentifier('');
    setError('');
    onClose();
  };

  const styles = createStyles(colors);
  const identifierError = validateCrewIdentifier(crewIdentifier);
  const isFormValid = !identifierError && crewIdentifier.trim() && crewIdentifier.trim().toUpperCase() !== currentCrewIdentifier.trim().toUpperCase();

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
          <Text style={styles.title}>EDIT CREW IDENTIFIER</Text>
          
          <Text style={styles.descriptionText}>
            Update your crew identifier. Crew identifiers must be unique and can contain up to 5 characters (letters, numbers, _, and -). The identifier will be automatically converted to uppercase.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Crew Identifier (Maximum 5 characters)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: (error || identifierError) ? colors.error : colors.secondary,
                  backgroundColor: colors.inputBg || colors.surface,
                  color: colors.text.primary,
                }
              ]}
              value={crewIdentifier}
              onChangeText={handleCrewIdentifierChange}
              placeholder="Enter crew identifier..."
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              editable={!isUpdating}
            />
            {(error || identifierError) ? (
              <Text style={styles.errorText}>{error || identifierError}</Text>
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
                <Text style={styles.updateButtonText}>UPDATE IDENTIFIER</Text>
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

