import React, { useState } from 'react';
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

interface DisbandCrewModalProps {
  visible: boolean;
  onClose: () => void;
  onDisband: (crewIdentifier: string) => Promise<void>;
  crewIdentifier: string;
}

export const DisbandCrewModal: React.FC<DisbandCrewModalProps> = ({
  visible,
  onClose,
  onDisband,
  crewIdentifier,
}) => {
  const colors = useThemeColors();
  const [identifierInput, setIdentifierInput] = useState('');
  const [isDisbanding, setIsDisbanding] = useState(false);
  const [error, setError] = useState('');

  const handleDisband = async () => {
    const normalizedInput = identifierInput.trim().toUpperCase();
    const normalizedCrewIdentifier = crewIdentifier.trim().toUpperCase();

    if (normalizedInput !== normalizedCrewIdentifier) {
      setError('Identifier does not match');
      return;
    }

    setError('');
    setIsDisbanding(true);
    try {
      await onDisband(normalizedInput);
    } catch (error: any) {
      setError(error?.message || 'Failed to disband crew. Please try again.');
    } finally {
      setIsDisbanding(false);
    }
  };

  const handleClose = () => {
    setIdentifierInput('');
    setError('');
    onClose();
  };

  const styles = createStyles(colors);
  const isFormValid = identifierInput.trim().toUpperCase() === crewIdentifier.trim().toUpperCase();

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
          <Text style={styles.title}>⚠️ DISBAND CREW</Text>
          
          <Text style={styles.warningText}>
            You are about to permanently disband the entire crew. This action is irreversible.
            {'\n\n'}
            Consider these alternatives instead:
            {'\n'}
            • Resign and pass leadership to the next person in line
            {'\n'}
            • Choose a Successor to transfer leadership
            {'\n\n'}
            If you still wish to proceed, type the crew identifier below to confirm.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Type crew identifier to confirm: <Text style={{ color: colors.error }}>{crewIdentifier}</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: error ? colors.error : colors.secondary,
                  backgroundColor: colors.inputBg || colors.surface,
                }
              ]}
              value={identifierInput}
              onChangeText={(text) => {
                setIdentifierInput(text);
                setError('');
              }}
              placeholder="Enter crew identifier"
              placeholderTextColor={colors.text.placeholder}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              editable={!isDisbanding}
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isDisbanding}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.disbandButton,
                (!isFormValid || isDisbanding) && styles.disbandButtonDisabled
              ]}
              onPress={handleDisband}
              disabled={!isFormValid || isDisbanding}
              activeOpacity={0.7}
            >
              {isDisbanding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.disbandButtonText}>DISBAND CREW</Text>
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
  inputContainer: {
    marginBottom: SIZING.spacing.lg,
  },
  inputLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
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
  disbandButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  disbandButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  disbandButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
});

