import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { CloseButton } from '../../common/CloseButton';
import { BotTypeCard } from './BotTypeCard';
import { createStyles } from './styles';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useTheme } from '../../../context/ThemeContext';
import { BotType } from '../../../types/bots';
import { QuantitySelector } from './QuantitySelector';
import { useTaskGuideHighlight } from '../../../contexts/TaskGuideHighlightContext';
import {
  BOT_FAMILY_ORDER,
  M1_UNIT_DISPLAY_NAMES,
  RPS_TYPE_LABELS,
  battalionModalDropdownSummary,
  battalionModalOptionLine,
} from '../../../utils/botInventory';
import { formatNumber } from '../../../utils/formatUtils';

const AnimatedBorderHighlight = React.memo(({ colors }: { colors: any }) => {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useRef(new Animated.Value(0)).current;

  const highlightColors = [colors.primary, colors.secondary, colors.matrix];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentColorIndex((prev) => (prev + 1) % highlightColors.length);
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
        },
      ]}
      pointerEvents="none"
    />
  );
});

export type BattalionBotChoice = { botType: BotType; markLevel: 1 | 2 };

type Props = {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: { botType: BotType; quantity: number; markLevel: 1 | 2 }) => Promise<void> | void;
  battalionName: string;
  availableM1: Record<BotType, number>;
  availableM2: Record<BotType, number>;
  mark2Unlocked: boolean;
  maxQuantityOverride?: number;
};

export const BattalionBotSelector = React.memo(
  ({
    isVisible,
    onClose,
    onSubmit,
    battalionName,
    availableM1,
    availableM2,
    mark2Unlocked,
    maxQuantityOverride,
  }: Props) => {
    const colors = useThemeColors();
    const { themeMode } = useTheme();
    const styles = createStyles({ ...colors, themeMode });
    const { highlightTaskId, highlightStep, advanceHighlightStep, clearHighlight } = useTaskGuideHighlight();
    const [selectedChoice, setSelectedChoice] = useState<BattalionBotChoice | null>(null);
    const [quantity, setQuantity] = useState(0);
    const [pickerFamily, setPickerFamily] = useState<BotType | null>(null);

    const isFreeHackRig = highlightTaskId === 'free-hack-rig';
    const isGuardiansSelectionHighlight = isFreeHackRig && highlightStep === 'guardians-selection';
    const isAssignBotsHighlight = isFreeHackRig && highlightStep === 'assign-bots';
    const hasZeroGuardians = isGuardiansSelectionHighlight && availableM1.guardian === 0;

    const handleClose = React.useCallback(() => {
      setPickerFamily(null);
      if (hasZeroGuardians) {
        clearHighlight();
      }
      onClose();
    }, [hasZeroGuardians, clearHighlight, onClose]);

    const guardianM1MeasureRef = React.useRef<View>(null);
    const [guardianCardPosition, setGuardianCardPosition] = React.useState<{
      pageX: number;
      pageY: number;
      width: number;
      height: number;
    } | null>(null);

    // Bugbot: flagged measureInWindow vs absolute positioning. Not a bug — modalOverlay is
    // flex:1 inside overFullScreen Modal, so its bounds match the window origin (0,0).
    useEffect(() => {
      if (isGuardiansSelectionHighlight && !hasZeroGuardians && guardianM1MeasureRef.current) {
        const t = setTimeout(() => {
          guardianM1MeasureRef.current?.measureInWindow((x, y, width, height) => {
            setGuardianCardPosition({ pageX: x, pageY: y, width, height });
          });
        }, 100);
        return () => clearTimeout(t);
      }
      setGuardianCardPosition(null);
      return undefined;
    }, [isGuardiansSelectionHighlight, hasZeroGuardians, isVisible, mark2Unlocked, pickerFamily]);

    const availableForSelected = React.useMemo(() => {
      if (!selectedChoice) return 0;
      return selectedChoice.markLevel === 2
        ? availableM2[selectedChoice.botType]
        : availableM1[selectedChoice.botType];
    }, [selectedChoice, availableM1, availableM2]);

    const handleSubmit = React.useCallback(async () => {
      if (selectedChoice) {
        try {
          await onSubmit({
            botType: selectedChoice.botType,
            quantity,
            markLevel: selectedChoice.markLevel,
          });
          if (isAssignBotsHighlight) {
            advanceHighlightStep();
          }
        } catch (error) {
          console.error('Failed to assign bots:', error);
        }
      }
    }, [selectedChoice, quantity, onSubmit, isAssignBotsHighlight, advanceHighlightStep]);

    useEffect(() => {
      if (isGuardiansSelectionHighlight && selectedChoice?.botType === 'guardian' && selectedChoice.markLevel === 1) {
        const availableGuardians = availableM1.guardian;
        const computedQuantity = Math.min(100, availableGuardians);
        setQuantity(computedQuantity);
        if (computedQuantity > 0) {
          advanceHighlightStep();
        }
      } else if (!isAssignBotsHighlight) {
        setQuantity(0);
      }
    }, [
      selectedChoice,
      isGuardiansSelectionHighlight,
      isAssignBotsHighlight,
      advanceHighlightStep,
      availableM1.guardian,
    ]);

    useEffect(() => {
      if (isAssignBotsHighlight) {
        setSelectedChoice({ botType: 'guardian', markLevel: 1 });
        const availableGuardians = availableM1.guardian;
        setQuantity(Math.min(100, availableGuardians));
      }
    }, [isAssignBotsHighlight, availableM1.guardian]);

    useEffect(() => {
      setSelectedChoice(null);
      setQuantity(0);
      setPickerFamily(null);
    }, [battalionName]);

    const columnDisabled = (family: BotType) =>
      (isGuardiansSelectionHighlight && family !== 'guardian') || isAssignBotsHighlight;

    const markOptionDisabled = (family: BotType, markLevel: 1 | 2) => {
      if (columnDisabled(family)) {
        return true;
      }
      const pool = markLevel === 2 ? availableM2 : availableM1;
      return pool[family] === 0;
    };

    const shouldHideGuardianM1 = isGuardiansSelectionHighlight && !hasZeroGuardians;

    const openPicker = (family: BotType) => {
      if (columnDisabled(family)) return;
      setPickerFamily(family);
    };

    const selectMarkInPicker = (family: BotType, markLevel: 1 | 2) => {
      if (markOptionDisabled(family, markLevel)) return;
      setSelectedChoice({ botType: family, markLevel });
      setPickerFamily(null);
    };

    const dropdownBorder = (family: BotType) => {
      const selectedHere = selectedChoice?.botType === family;
      return selectedHere ? colors.secondary : themeMode === 'light' ? 'rgba(71, 23, 246, 0.4)' : 'rgba(71, 23, 246, 0.35)';
    };

    const dropdownLabelForFamily = (family: BotType): string => {
      if (selectedChoice?.botType === family) {
        const pool = selectedChoice.markLevel === 2 ? availableM2 : availableM1;
        return battalionModalDropdownSummary(family, selectedChoice.markLevel, pool[family] ?? 0);
      }
      return 'Tap to choose unit';
    };

    const pickerOptionsForFamily = (family: BotType): { markLevel: 1 | 2; disabled: boolean }[] => {
      const opts: { markLevel: 1 | 2; disabled: boolean }[] = [
        { markLevel: 1, disabled: markOptionDisabled(family, 1) },
      ];
      if (mark2Unlocked) {
        opts.push({ markLevel: 2, disabled: markOptionDisabled(family, 2) });
      }
      return opts;
    };

    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        supportedOrientations={['landscape']}
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={isGuardiansSelectionHighlight && !hasZeroGuardians && { pointerEvents: 'none', opacity: 0.3 }}>
              <CloseButton onPress={handleClose} />
            </View>

            <Text style={styles.title}>SELECT BOTS</Text>
            <Text style={styles.battalionName}>BATTALION {battalionName}</Text>

            <View
              style={[
                styles.botTypeContainer,
                isGuardiansSelectionHighlight && {
                  zIndex: 10000,
                  elevation: 10000,
                  position: 'relative',
                },
              ]}
            >
              {BOT_FAMILY_ORDER.map((family) => {
                const rpsTitle = RPS_TYPE_LABELS[family];

                return (
                  <View key={family} style={styles.familyColumn}>
                    <Text
                      style={[
                        styles.familyColumnTitle,
                        { color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)' },
                      ]}
                    >
                      {rpsTitle}
                    </Text>

                    {family === 'guardian' && shouldHideGuardianM1 ? (
                      <View ref={guardianM1MeasureRef} style={{ width: '100%', minHeight: 44 }} />
                    ) : (
                      <View
                        ref={family === 'guardian' ? guardianM1MeasureRef : undefined}
                        collapsable={false}
                        style={{ width: '100%' }}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          disabled={columnDisabled(family)}
                          onPress={() => openPicker(family)}
                          style={[
                            styles.familyDropdown,
                            {
                              borderColor: dropdownBorder(family),
                              backgroundColor:
                                themeMode === 'light' ? 'rgba(245, 245, 220, 0.95)' : 'rgba(10, 10, 10, 0.95)',
                              opacity: columnDisabled(family) ? 0.45 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.familyDropdownText, { color: colors.secondary }]}
                            numberOfLines={3}
                          >
                            {dropdownLabelForFamily(family)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {selectedChoice && (
              <View
                style={[
                  styles.quantityContainer,
                  (isGuardiansSelectionHighlight || isAssignBotsHighlight) && {
                    pointerEvents: 'none',
                    opacity: 0.3,
                  },
                ]}
              >
                <QuantitySelector
                  quantity={quantity}
                  available={availableForSelected}
                  onChangeQuantity={setQuantity}
                  disabled={isAssignBotsHighlight}
                  maxQuantityOverride={maxQuantityOverride}
                />
              </View>
            )}

            <View style={isAssignBotsHighlight && { zIndex: 1000 }}>
              <TouchableOpacity
                style={[
                  styles.deployButton,
                  (!selectedChoice ||
                    quantity === 0 ||
                    (!isAssignBotsHighlight && quantity > availableForSelected)) &&
                    styles.deployButtonDisabled,
                  isAssignBotsHighlight && { borderWidth: 3, borderColor: undefined },
                ]}
                onPress={handleSubmit}
                disabled={
                  !selectedChoice ||
                  quantity === 0 ||
                  (!isAssignBotsHighlight && quantity > availableForSelected)
                }
              >
                {isAssignBotsHighlight && <AnimatedBorderHighlight colors={colors} />}
                <Text
                  style={[
                    styles.deployButtonText,
                    (!selectedChoice ||
                      quantity === 0 ||
                      (!isAssignBotsHighlight && quantity > availableForSelected)) &&
                      styles.deployButtonTextDisabled,
                  ]}
                >
                  ASSIGN BOTS
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {pickerFamily != null && (
            <View style={styles.pickerOverlayRoot} pointerEvents="box-none">
              <Pressable style={styles.pickerBackdrop} onPress={() => setPickerFamily(null)} />
              <View
                style={[
                  styles.pickerSheet,
                  {
                    backgroundColor: themeMode === 'light' ? 'rgba(245, 245, 220, 0.98)' : 'rgba(18, 18, 18, 0.98)',
                    borderColor: colors.secondary,
                  },
                ]}
                onStartShouldSetResponder={() => true}
              >
                <Text style={[styles.pickerTitle, { color: colors.secondary }]}>
                  {RPS_TYPE_LABELS[pickerFamily]}
                </Text>
                <ScrollView
                  style={styles.pickerScroll}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {pickerOptionsForFamily(pickerFamily).map(({ markLevel, disabled }) => {
                    const pool = markLevel === 2 ? availableM2 : availableM1;
                    const n = pool[pickerFamily] ?? 0;
                    return (
                      <TouchableOpacity
                        key={markLevel}
                        disabled={disabled}
                        onPress={() => selectMarkInPicker(pickerFamily, markLevel)}
                        style={[
                          styles.pickerOption,
                          {
                            borderBottomColor:
                              themeMode === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
                            opacity: disabled ? 0.4 : 1,
                          },
                          selectedChoice?.botType === pickerFamily &&
                            selectedChoice.markLevel === markLevel && {
                              backgroundColor: colors.secondary + '22',
                            },
                        ]}
                      >
                        <Text style={[styles.pickerOptionText, { color: colors.secondary }]}>
                          {battalionModalOptionLine(pickerFamily, markLevel)}
                        </Text>
                        <Text
                          style={[
                            styles.pickerOptionSub,
                            { color: themeMode === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)' },
                          ]}
                        >
                          Available: {formatNumber(n)}
                          {disabled ? ' — none in army' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {isGuardiansSelectionHighlight && !hasZeroGuardians && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                zIndex: 9999,
                elevation: 9999,
              }}
              pointerEvents="auto"
            />
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
                count={availableM1.guardian}
                isSelected={selectedChoice?.botType === 'guardian' && selectedChoice?.markLevel === 1}
                onSelect={() => setSelectedChoice({ botType: 'guardian', markLevel: 1 })}
                isHighlighted
                disabled={false}
                titleText={M1_UNIT_DISPLAY_NAMES.guardian}
                markBadge="M1"
              />
            </View>
          )}
        </View>
      </Modal>
    );
  }
);
