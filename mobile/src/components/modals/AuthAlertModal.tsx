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

interface AuthAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onPress: () => void;
}

export const AuthAlertModal: React.FC<AuthAlertModalProps> = ({
  visible,
  title,
  message,
  buttonText = 'OK',
  onPress,
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
                {title}
              </Text>
              
              <Text style={[styles.message, { color: colors.text.secondary }]}>
                {message}
              </Text>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.secondary }]}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  {buttonText}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 8,
    padding: SIZING.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.md,
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.sm,
    ...styleGuide.matrixGlow,
  },
  message: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    lineHeight: SIZING.font.body * 1.4,
  },
  button: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 4,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
});
