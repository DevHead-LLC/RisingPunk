import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

interface ShieldCheckModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export const ShieldCheckModal: React.FC<ShieldCheckModalProps> = ({
  visible,
  onClose,
  onContinue,
}) => {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        onPress={onClose} 
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
          <View style={styles.shieldIconContainer}>
            <Image
              source={require('../../assets/images/hackMap/activatedShield.png')}
              style={styles.shieldIcon}
              resizeMode="contain"
            />
          </View>
          
          <Text style={[styles.popupTitle, { color: colors.matrix }]}>
            SHIELD ACTIVE
          </Text>
          
          <Text style={[styles.popupMessage, { color: colors.text.secondary }]}>
            You have an active antivirus shield protecting your system.{'\n\n'}
            Proceeding with this attack will deactivate your current shield and trigger a 15-minute cooldown period before you're able to shield again.{'\n\n'}
            Continue with the attack?
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.continueButton, { 
                backgroundColor: colors.matrix,
                borderColor: colors.matrix 
              }]} 
              onPress={onContinue}
            >
              <Text style={[styles.continueButtonText, { color: colors.background }]}>
                CONTINUE
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: colors.matrix }]} 
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.matrix }]}>
                CANCEL
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '80%',
    maxWidth: 500,
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  shieldIconContainer: {
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  shieldIcon: {
    width: 48,
    height: 48,
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
    letterSpacing: 1,
  },
  popupMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZING.spacing.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  continueButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
