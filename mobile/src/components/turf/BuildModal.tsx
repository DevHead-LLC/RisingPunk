import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface BuildModalProps {
  visible: boolean;
  title: string;
  cost: number;
  buildTime: string;
  hasSufficientFunds: boolean;
  onBuild: () => void;
  onClose: () => void;
  buildButtonText?: string;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  visible,
  title,
  cost,
  buildTime,
  hasSufficientFunds,
  onBuild,
  onClose,
  buildButtonText = 'Build'
}) => {
  const colors = useThemeColors();

  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          style={[styles.popup, { backgroundColor: colors.background, borderColor: colors.matrix }]} 
          onPress={() => {}} 
          activeOpacity={1}
        >
          <Text style={[styles.popupTitle, { color: colors.secondary }]}>{title}</Text>
          <Text style={[styles.popupPrice, { color: colors.matrix }]}>{formatCost(cost)}</Text>
          <Text style={[styles.buildTime, { color: colors.secondary }]}>Time to build: {buildTime}</Text>
          <TouchableOpacity 
            style={[
              styles.buildButton, 
              { 
                backgroundColor: hasSufficientFunds ? colors.matrix : colors.buttonDisabled,
                opacity: hasSufficientFunds ? 1 : 0.6
              }
            ]} 
            onPress={onBuild}
            disabled={!hasSufficientFunds}
          >
            <Text style={[
              styles.buildButtonText, 
              { 
                color: hasSufficientFunds ? colors.background : colors.text.secondary 
              }
            ]}>
              {buildButtonText}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.closeButton, { borderColor: colors.matrix }]} onPress={onClose}>
            <Text style={[styles.closeButtonText, { color: colors.secondary }]}>Close</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  popup: {
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 400,
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  popupPrice: {
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  buildTime: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  buildButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 6,
    marginBottom: SIZING.spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  buildButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderWidth: 1,
    borderRadius: 4,
  },
  closeButtonText: {
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
});
