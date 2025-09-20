import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING, styleGuide } from '../../styles/theme';

interface AccountSwitchedModalProps {
  visible: boolean;
  onLogOut: () => void;
}

export const AccountSwitchedModal: React.FC<AccountSwitchedModalProps> = ({
  visible,
  onLogOut,
}) => {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      supportedOrientations={['landscape']}
      hardwareAccelerated={true}
      presentationStyle="overFullScreen"
    >
      <TouchableWithoutFeedback>
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.modalContent, { borderColor: colors.matrix }]}>
              <Text style={[styles.title, { color: colors.text.accent }]}>
                Account Switched
              </Text>
              
              <Text style={[styles.message, { color: colors.text.secondary }]}>
                Someone else has logged into this account on another device. You have been logged out.
              </Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.secondary }]}
                onPress={onLogOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SIZING.screen.width * 0.4,
    maxWidth: 400,
    borderRadius: 12,
    padding: SIZING.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContent: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
  },
  title: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  message: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SIZING.spacing.lg,
  },
  button: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
});
