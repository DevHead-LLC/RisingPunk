import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { CloseButton } from '../../common/CloseButton';
import { BotTypeCard } from './BotTypeCard';
import { createStyles } from './styles';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useTheme } from '../../../context/ThemeContext';
import { BotType } from '../../../types/bots';
import { QuantitySelector } from './QuantitySelector';
import { useTaskGuideHighlight } from '../../../contexts/TaskGuideHighlightContext';
import { TaskGuideHighlightOverlay } from '../../turf/TaskGuideHighlightOverlay';

const AnimatedBorderHighlight = React.memo(({ colors }: { colors: any }) => {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useRef(new Animated.Value(0)).current;
  
  const highlightColors = [colors.primary, colors.secondary, colors.matrix];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentColorIndex(prev => (prev + 1) % highlightColors.length);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [highlightColors.length]);

  useEffect(() => {
    Animated.timing(animatedBorderColor, {
      toValue: currentColorIndex,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentColorIndex, animatedBorderColor]);

  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: highlightColors,
  });

  return (
    <Animated.View 
      style={[
        StyleSheet.absoluteFill,
        {
          borderWidth: 3,
          borderColor: animatedBorderColorValue,
          borderRadius: 8,
        }
      ]} 
      pointerEvents="none"
    />
  );
});

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: { botType: BotType; quantity: number }) => Promise<void> | void;
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
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const styles = createStyles({ ...colors, themeMode });
  const { highlightTaskId, highlightStep, advanceHighlightStep } = useTaskGuideHighlight();
  const [selectedType, setSelectedType] = useState<BotType | null>(null);
  const [quantity, setQuantity] = useState(0);
  
  const isFreeHackRig = highlightTaskId === 'free-hack-rig';
  const isGuardiansSelectionHighlight = isFreeHackRig && highlightStep === 'guardians-selection';
  const isAssignBotsHighlight = isFreeHackRig && highlightStep === 'assign-bots';
  const botTypeContainerRef = React.useRef<View>(null);
  const [guardianCardPosition, setGuardianCardPosition] = React.useState<{ pageX: number; pageY: number; width: number; height: number } | null>(null);
  
  useEffect(() => {
    if (isGuardiansSelectionHighlight && botTypeContainerRef.current) {
      setTimeout(() => {
        botTypeContainerRef.current?.measure((x, y, width, height, pageX, pageY) => {
          const guardianCardX = pageX + (width / 2) - 60;
          const guardianCardY = pageY;
          setGuardianCardPosition({ pageX: guardianCardX, pageY: guardianCardY, width: 120, height: 80 });
        });
      }, 100);
    } else {
      setGuardianCardPosition(null);
    }
  }, [isGuardiansSelectionHighlight]);


  const handleSubmit = React.useCallback(async () => {
    if (selectedType) {
      try {
        await onSubmit({ botType: selectedType, quantity });
        if (isAssignBotsHighlight) {
          advanceHighlightStep();
        }
      } catch (error) {
        console.error('Failed to assign bots:', error);
      }
    }
  }, [selectedType, quantity, onSubmit, isAssignBotsHighlight, advanceHighlightStep]);

  // Reset quantity when bot type changes
  useEffect(() => {
    if (isGuardiansSelectionHighlight && selectedType === 'guardian') {
      const availableGuardians = availableBots.guardian;
      setQuantity(Math.min(100, availableGuardians));
      advanceHighlightStep();
    } else if (!isAssignBotsHighlight) {
      setQuantity(0);
    }
  }, [selectedType, isGuardiansSelectionHighlight, isAssignBotsHighlight, advanceHighlightStep, availableBots.guardian]);

  // Force guardians on assign-bots step (use available count, up to 100)
  useEffect(() => {
    if (isAssignBotsHighlight) {
      setSelectedType('guardian');
      const availableGuardians = availableBots.guardian;
      setQuantity(Math.min(100, availableGuardians));
    }
  }, [isAssignBotsHighlight, availableBots.guardian]);

  // Reset selected type and quantity when battalion changes
  useEffect(() => {
    setSelectedType(null);
    setQuantity(0);
  }, [battalionName]);

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
          <View style={isGuardiansSelectionHighlight && { pointerEvents: 'none', opacity: 0.3 }}>
            <CloseButton onPress={onClose} />
          </View>

          <Text style={styles.title}>SELECT BOTS</Text>
          <Text style={styles.battalionName}>BATTALION {battalionName}</Text>

          <View 
            ref={botTypeContainerRef}
            style={[styles.botTypeContainer, isGuardiansSelectionHighlight && {
              zIndex: 10000,
              elevation: 10000,
              position: 'relative',
            }]}>
            {(['breacher', 'guardian', 'phreak'] as BotType[]).map((type) => {
              const shouldHide = isGuardiansSelectionHighlight && type === 'guardian';
              if (shouldHide) {
                return (
                  <View key={type} style={{ width: 120, height: 80 }} />
                );
              }
              const isHighlighted = false;
              const isDisabled = (isGuardiansSelectionHighlight && type !== 'guardian') || isAssignBotsHighlight;
              return (
                <BotTypeCard
                  key={type}
                  type={type}
                  count={availableBots[type]}
                  isSelected={selectedType === type}
                  onSelect={setSelectedType}
                  isHighlighted={isHighlighted}
                  disabled={isDisabled}
                />
              );
            })}
          </View>

          {selectedType && (
            <View style={[styles.quantityContainer, (isGuardiansSelectionHighlight || isAssignBotsHighlight) && { pointerEvents: 'none', opacity: 0.3 }]}>
              <QuantitySelector
                quantity={quantity}
                available={availableBots[selectedType]}
                onChangeQuantity={setQuantity}
                disabled={isAssignBotsHighlight}
              />
            </View>
          )}

          <View style={isAssignBotsHighlight && { zIndex: 1000 }}>
            <TouchableOpacity
              style={[
                styles.deployButton, 
                (!selectedType || quantity === 0 || (!isAssignBotsHighlight && quantity > availableBots[selectedType!])) && styles.deployButtonDisabled,
                isAssignBotsHighlight && { borderWidth: 3, borderColor: undefined }
              ]}
              onPress={handleSubmit}
              disabled={!selectedType || quantity === 0 || (!isAssignBotsHighlight && quantity > availableBots[selectedType!])}
            >
              {isAssignBotsHighlight && (
                <AnimatedBorderHighlight colors={colors} />
              )}
              <Text style={[styles.deployButtonText, (!selectedType || quantity === 0 || quantity > availableBots[selectedType!]) && styles.deployButtonTextDisabled]}>
                ASSIGN BOTS
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {isGuardiansSelectionHighlight && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            elevation: 9999,
          }} pointerEvents="auto" />
        )}
        {isGuardiansSelectionHighlight && guardianCardPosition && (
          <View
            style={{
              position: 'absolute',
              top: guardianCardPosition.pageY,
              left: guardianCardPosition.pageX,
              width: guardianCardPosition.width,
              height: guardianCardPosition.height,
              zIndex: 10000,
              elevation: 10000,
              pointerEvents: 'box-none',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <BotTypeCard
              type="guardian"
              count={availableBots.guardian}
              isSelected={selectedType === 'guardian'}
              onSelect={setSelectedType}
              isHighlighted={true}
              disabled={false}
            />
          </View>
        )}
      </View>
    </Modal>
  );
});
