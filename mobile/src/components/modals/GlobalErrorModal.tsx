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

interface GlobalErrorModalProps {
  visible: boolean;
  onLogOut: () => void;
}

export const GlobalErrorModal: React.FC<GlobalErrorModalProps> = ({
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
                Something went wrong
              </Text>
              
              <Text style={[styles.message, { color: colors.text.secondary }]}>
                Please Sign In
              </Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.secondary }]}
                onPress={onLogOut}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Log Out
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
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContent: {
    padding: SIZING.spacing.lg,
    borderWidth: 2,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
    ...styleGuide.matrixGlow,
  },
  message: {
    fontSize: SIZING.font.large,
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    ...styleGuide.matrixGlow,
  },
  button: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    minWidth: 140,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
    ...styleGuide.matrixGlow,
  },
});
