/**
 * Small modal to jump the map to grid coordinates (0–499).
 * Accepts digits only; X and Y must be in range 0–499 on submit.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

const MIN_COORD = 0;
const MAX_COORD = 499;
const MAX_DIGITS = 3;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export interface JumpToModalProps {
  visible: boolean;
  onClose: () => void;
  onJump: (x: number, y: number) => void;
}

export const JumpToModal: React.FC<JumpToModalProps> = ({
  visible,
  onClose,
  onJump,
}) => {
  const colors = useThemeColors();
  const [xInput, setXInput] = useState('');
  const [yInput, setYInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setXInput('');
      setYInput('');
      setError('');
    }
  }, [visible]);

  const handleXChange = useCallback((text: string) => {
    const filtered = digitsOnly(text);
    if (filtered.length <= MAX_DIGITS) setXInput(filtered);
  }, []);

  const handleYChange = useCallback((text: string) => {
    const filtered = digitsOnly(text);
    if (filtered.length <= MAX_DIGITS) setYInput(filtered);
  }, []);

  const handleSubmit = useCallback(() => {
    const x = xInput === '' ? NaN : parseInt(xInput, 10);
    const y = yInput === '' ? NaN : parseInt(yInput, 10);
    if (xInput === '' || yInput === '' || Number.isNaN(x) || Number.isNaN(y)) {
      setError('Enter X and Y (0–499)');
      return;
    }
    if (x < MIN_COORD || x > MAX_COORD || y < MIN_COORD || y > MAX_COORD) {
      setError(`X and Y must be between ${MIN_COORD} and ${MAX_COORD}`);
      return;
    }
    setError('');
    onJump(x, y);
    onClose();
  }, [xInput, yInput, onJump, onClose]);

  const handleClose = useCallback(() => {
    setError('');
    onClose();
  }, [onClose]);

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['landscape-left', 'landscape-right']}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary, borderColor: colors.secondary }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Jump To</Text>
          <View style={styles.row}>
            <Text style={styles.label}>X</Text>
            <TextInput
              style={styles.input}
              value={xInput}
              onChangeText={handleXChange}
              keyboardType="number-pad"
              maxLength={MAX_DIGITS}
              placeholder="0–499"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Y</Text>
            <TextInput
              style={styles.input}
              value={yInput}
              onChangeText={handleYChange}
              keyboardType="number-pad"
              maxLength={MAX_DIGITS}
              placeholder="0–499"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Go</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: SIZING.spacing.lg,
      borderWidth: 1,
      borderColor: colors.secondary,
      minWidth: 220,
    },
    closeButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 22,
      borderWidth: 2,
      zIndex: 1000,
    },
    closeButtonText: {
      fontSize: 28,
      marginTop: -2,
    },
    title: {
      color: colors.text.primary,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: SIZING.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SIZING.spacing.sm,
    },
    label: {
      color: colors.text.primary,
      fontSize: SIZING.font.body,
      width: 24,
      marginRight: SIZING.spacing.sm,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.secondary,
      borderRadius: 8,
      paddingHorizontal: SIZING.spacing.md,
      paddingVertical: SIZING.spacing.sm,
      color: colors.text.primary,
      fontSize: SIZING.font.body,
    },
    errorText: {
      color: colors.error,
      fontSize: SIZING.font.small,
      marginBottom: SIZING.spacing.sm,
      textAlign: 'center',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: SIZING.spacing.md,
      alignItems: 'center',
      marginTop: SIZING.spacing.xs,
    },
    submitButtonText: {
      color: colors.background,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
  });
