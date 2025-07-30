import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { CloseButton } from '../../common/CloseButton';
import { BotTypeCard } from './BotTypeCard';
import { styles } from './styles';
import { BotType } from '../../../types/bots';
import { QuantitySelector } from './QuantitySelector';

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: { botType: BotType; quantity: number }) => void;
  battalionName: string;
  availableBots: Record<BotType, number>;
};

export const BattalionBotSelector = React.memo(({
  isVisible,
  onClose,
  onSubmit,
  battalionName,
  availableBots,
}: Props) => {
  const [selectedType, setSelectedType] = useState<BotType | null>(null);
  const [quantity, setQuantity] = useState(0);

  const handleSubmit = React.useCallback(() => {
    if (selectedType) {
      onSubmit({ botType: selectedType, quantity });
    }
  }, [selectedType, quantity, onSubmit]);

  // Reset quantity when bot type changes
  useEffect(() => {
    setQuantity(0);
  }, [selectedType]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <CloseButton onPress={onClose} />

          <Text style={styles.title}>SELECT BOTS</Text>
          <Text style={styles.battalionName}>BATTALION {battalionName}</Text>

          <View style={styles.botTypeContainer}>
            {(['breacher', 'guardian', 'phreak'] as BotType[]).map((type) => (
              <BotTypeCard
                key={type}
                type={type}
                count={availableBots[type]}
                isSelected={selectedType === type}
                onSelect={setSelectedType}
              />
            ))}
          </View>

          {selectedType && (
            <View style={styles.quantityContainer}>
              <QuantitySelector
                quantity={quantity}
                available={availableBots[selectedType]}
                onChangeQuantity={setQuantity}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.deployButton, !selectedType && styles.deployButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedType || quantity === 0}
          >
            <Text style={[styles.deployButtonText, !selectedType && styles.deployButtonTextDisabled]}>
              ASSIGN BOTS
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});
