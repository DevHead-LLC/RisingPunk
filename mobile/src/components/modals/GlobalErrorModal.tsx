import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

interface GlobalErrorModalProps {
  visible: boolean;
  onLogOut: () => void;
  /** When 'server_down', shows server-down message and asks user to sign in again when server is back. */
  variant?: 'generic' | 'server_down' | null;
}

export const GlobalErrorModal: React.FC<GlobalErrorModalProps> = ({
  visible,
  onLogOut,
  variant = 'generic',
}) => {
  const colors = useThemeColors();

  /** Single handler for Log Out. No onPressOut on Android to avoid double-fire (Bugbot: both onPress and onPressOut fire on one tap). */
  const handleButtonPress = useCallback(() => {
    onLogOut();
  }, [onLogOut]);

  const isServerDown = variant === 'server_down';
  const title = isServerDown ? 'The server is down' : 'Something went wrong';
  const message = isServerDown
    ? 'Please try again later. Sign in again when the server is back.'
    : 'Please Sign In';

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

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.secondary },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleButtonPress}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Log Out
                </Text>
              </Pressable>
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
