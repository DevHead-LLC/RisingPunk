import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface SystemBreachModalProps {
  visible: boolean;
  onCancel: () => void;
  onExecuteExploit: () => void;
}

export const SystemBreachModal: React.FC<SystemBreachModalProps> = ({
  visible,
  onCancel,
  onExecuteExploit
}) => {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        onPress={onCancel} 
        activeOpacity={1}
      >
        <TouchableOpacity 
          style={[styles.popup, { 
            backgroundColor: colors.background, 
            borderColor: colors.matrix,
            shadowColor: colors.matrix
          }]} 
          onPress={() => {}} 
          activeOpacity={1}
        >
          <View style={styles.warningIconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>
          
          <Text style={[styles.popupTitle, { color: colors.error }]}>
            SYSTEM BREACH DETECTED
          </Text>
          
          <Text style={[styles.popupMessage, { color: colors.text.secondary }]}>
            TESLA_GRID has root access to your system.{'\n'}Shell injection detected in Hack Rig kernel.{'\n\n'}Initiate countermeasures to regain control.
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.cancelButton, { 
                borderColor: colors.matrix,
                backgroundColor: 'transparent'
              }]} 
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: colors.matrix }]}>
                CANCEL
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.executeButton, { 
                backgroundColor: colors.error,
                borderColor: colors.error
              }]} 
              onPress={onExecuteExploit}
            >
              <Text style={[styles.executeButtonText, { color: colors.background }]}>
                EXECUTE EXPLOIT
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  popup: {
    padding: SIZING.spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 450,
    maxWidth: 550,
    maxHeight: '80%',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  warningIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 69, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZING.spacing.lg,
    borderWidth: 2,
    borderColor: '#FF4500',
  },
  warningIcon: {
    fontSize: 28,
  },
  popupTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.lg,
    textAlign: 'center',
    letterSpacing: 2,
  },
  popupMessage: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.lg,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SIZING.spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  executeButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 6,
    minWidth: 160,
    alignItems: 'center',
    borderWidth: 1,
  },
  executeButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
