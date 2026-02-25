/**
 * Small modal to jump the map to grid coordinates (0–499).
 * Accepts digits only; X and Y must be in range 0–499 on submit.
 * Layout: title "Jump To" above a bar (X input, Y input, Go, Cancel) positioned above the software keyboard.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['landscape-left', 'landscape-right']}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.overlayInner}>
              <View style={[styles.content, { backgroundColor: colors.background, borderColor: colors.secondary }]}>
                <Text style={[styles.title, { color: colors.text.primary }]}>Jump To</Text>
                <View style={styles.bar}>
                  <TextInput
                    style={[styles.input, { color: colors.text.primary, borderColor: colors.secondary }]}
                    value={xInput}
                    onChangeText={handleXChange}
                    keyboardType="number-pad"
                    maxLength={MAX_DIGITS}
                    placeholder="X 0–499"
                    placeholderTextColor={colors.text.secondary}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary, borderColor: colors.secondary }]}
                    value={yInput}
                    onChangeText={handleYChange}
                    keyboardType="number-pad"
                    maxLength={MAX_DIGITS}
                    placeholder="Y 0–499"
                    placeholderTextColor={colors.text.secondary}
                  />
                  <Pressable
                    style={[styles.goButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                  >
                    <Text style={[styles.goButtonText, { color: colors.background }]}>Go</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.cancelButton, { borderColor: colors.secondary }]}
                    onPress={handleClose}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>Cancel</Text>
                  </Pressable>
                </View>
                {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const createStyles = () =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    overlayInner: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    content: {
      width: '100%',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderWidth: 1,
      padding: SIZING.spacing.lg,
      paddingBottom: SIZING.spacing.xl,
    },
    title: {
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: SIZING.spacing.md,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SIZING.spacing.sm,
    },
    input: {
      flex: 1,
      minWidth: 0,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: SIZING.spacing.md,
      paddingVertical: SIZING.spacing.sm,
      fontSize: SIZING.font.body,
    },
    goButton: {
      borderRadius: 8,
      paddingVertical: SIZING.spacing.sm,
      paddingHorizontal: SIZING.spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    goButtonText: {
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    cancelButton: {
      borderRadius: 8,
      borderWidth: 1,
      paddingVertical: SIZING.spacing.sm,
      paddingHorizontal: SIZING.spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: SIZING.font.body,
    },
    errorText: {
      fontSize: SIZING.font.small,
      marginTop: SIZING.spacing.sm,
      textAlign: 'center',
    },
  });

const styles = createStyles();
