import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Dimensions,
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

  const handleButtonPress = () => {
    console.log('🟢 CLIENT: GlobalErrorModal button onPress fired', { platform: Platform.OS, timestamp: Date.now() });
    onLogOut();
  };

  const handleButtonPressIn = () => {
    console.log('🟢 CLIENT: GlobalErrorModal button onPressIn (press down)', { platform: Platform.OS, timestamp: Date.now() });
  };

  const handleButtonPressOut = () => {
    console.log('🟢 CLIENT: GlobalErrorModal button onPressOut (press release)', { platform: Platform.OS, timestamp: Date.now() });
  };

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
                onPress={handleButtonPress}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
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
