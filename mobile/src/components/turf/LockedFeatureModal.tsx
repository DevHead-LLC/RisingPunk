import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface LockedFeatureModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  closeButtonText?: string;
}

export const LockedFeatureModal: React.FC<LockedFeatureModalProps> = ({
  visible,
  title,
  message,
  onClose,
  closeButtonText = 'CLOSE'
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
          <View style={styles.lockIconContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
          
          <Text style={[styles.popupTitle, { color: colors.matrix }]}>{title}</Text>
          
          <Text style={[styles.popupMessage, { color: colors.text.secondary }]}>
            {message}
          </Text>
          
          <TouchableOpacity 
            style={[styles.closeButton, { 
              backgroundColor: colors.matrix,
              borderColor: colors.matrix 
            }]} 
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: colors.background }]}>
              {closeButtonText}
            </Text>
          </TouchableOpacity>
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
    minWidth: 400,
    maxWidth: 500,
    maxHeight: '80%',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  lockIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZING.spacing.lg,
    borderWidth: 2,
    borderColor: '#666',
  },
  lockIcon: {
    fontSize: 28,
    color: '#666',
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
    marginBottom: SIZING.spacing.lg * 2,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SIZING.spacing.md,
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.lg,
    borderRadius: 6,
    minWidth: 200,
    alignItems: 'center',
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
