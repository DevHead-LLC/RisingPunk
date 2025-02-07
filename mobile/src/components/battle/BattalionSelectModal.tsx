import React, { useState } from 'react';
import { Modal, SafeAreaView, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type BotType = 'breacher' | 'guardian' | 'phreak';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (type: BotType, quantity: number) => void;
}

const BattalionSelectModal = ({ visible, onClose, onConfirm }: Props) => {
  const [selectedType, setSelectedType] = useState<BotType>('breacher');
  const [quantity, setQuantity] = useState(0);

  const updateQuantity = (change: number) => {
    setQuantity(Math.max(0, quantity + change));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" supportedOrientations={['landscape']}>
      <SafeAreaView style={styles.container}>
        <View style={styles.modal}>
          <Text style={styles.title}>SELECT TYPE_</Text>
          
          <View style={styles.typeRow}>
            <TouchableOpacity 
              style={[styles.typeButton, selectedType === 'breacher' && styles.selectedType]} 
              onPress={() => setSelectedType('breacher')}
            >
              <Text style={styles.typeText}>BREACHER</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, selectedType === 'guardian' && styles.selectedType]}
              onPress={() => setSelectedType('guardian')}
            >
              <Text style={styles.typeText}>GUARDIAN</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeButton, selectedType === 'phreak' && styles.selectedType]}
              onPress={() => setSelectedType('phreak')}
            >
              <Text style={styles.typeText}>PHREAK</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.quantityTitle}>QUANTITY_</Text>
          <View style={styles.quantityDisplay}>
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>

          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlButton} onPress={() => updateQuantity(-1)}>
              <Text style={styles.controlText}>-1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => updateQuantity(1)}>
              <Text style={styles.controlText}>+1</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.controlButton} onPress={() => updateQuantity(-25)}>
              <Text style={styles.controlText}>-25</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={() => updateQuantity(25)}>
              <Text style={styles.controlText}>+25</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={() => {
                onConfirm(selectedType, quantity);
                onClose();
              }}
            >
              <Text style={styles.confirmText}>CONFIRM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: Math.min(SCREEN_WIDTH * 0.6, 600),
    padding: SIZING.spacing.sm,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#00FF41',
    gap: SIZING.spacing.xs,
  },
  title: {
    color: '#4717F6',
    fontSize: SIZING.font.body,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  typeButton: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4717F6',
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  typeText: {
    color: '#4717F6',
    fontSize: SIZING.font.body,
  },
  quantityTitle: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
  },
  quantityDisplay: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FF41',
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  quantityText: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
  },
  controlRow: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  controlButton: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FF41',
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controlText: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
  },
  selectedType: {
    backgroundColor: 'rgba(71, 23, 246, 0.2)',
    borderColor: '#4717F6',
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
    marginTop: SIZING.spacing.sm,
  },
  cancelButton: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4717F6',
    borderRadius: 2,
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
  },
  confirmButton: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FF41',
    borderRadius: 2,
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
  },
  cancelText: {
    color: '#4717F6',
    fontSize: SIZING.font.body,
  },
  confirmText: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
  },
});

export default BattalionSelectModal; 