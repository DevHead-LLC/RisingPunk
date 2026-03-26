import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { formatBattalionAssignmentLine } from '../../utils/botInventory';

export type BattalionAssignment = {
  botType: string;
  markLevel: number;
  quantity: number;
} | null;

type Props = {
  name: string;
  isLocked?: boolean;
  isEnemy?: boolean;
  onPress?: () => void;
  assignment?: BattalionAssignment;
  isHighlighted?: boolean;
  disabled?: boolean;
};

export const BattalionSlot = React.memo(({
  name,
  isLocked = false,
  isEnemy = false,
  onPress,
  assignment,
  isHighlighted = false,
  disabled = false,
}: Props) => {
  const colors = useThemeColors();
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useRef(new Animated.Value(0)).current;
  
  const highlightColors = [colors.primary, colors.secondary, colors.matrix];

  useEffect(() => {
    if (isHighlighted) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % highlightColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isHighlighted, highlightColors.length]);

  useEffect(() => {
    if (isHighlighted) {
      Animated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isHighlighted, animatedBorderColor]);

  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: highlightColors,
  });

  const slotStyle = React.useMemo(() => [
    styles.slot,
    isEnemy ? styles.enemySlot : styles.activeSlot,
    isLocked && (isEnemy ? styles.lockedEnemySlot : styles.lockedSlot),
    isHighlighted && { 
      borderWidth: 3, 
      borderColor: undefined, 
      zIndex: 1001,
      elevation: 1001,
    },
  ], [isEnemy, isLocked, isHighlighted]);

  const textStyle = React.useMemo(() => [
    styles.slotText,
    isEnemy && styles.enemyText,
    isLocked && styles.lockedText,
  ], [isEnemy, isLocked]);

  const deployTextStyle = React.useMemo(() => [
    styles.deployText, 
    styles.lockedText
  ], []);

  const content = React.useMemo(() => (
    <>
      <Text style={textStyle}>BATTALION {name}</Text>
      {!assignment ? (
        !isEnemy && !isLocked && <Text style={styles.deployText}>+ Deploy</Text>
      ) : (
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentText}>
            {formatBattalionAssignmentLine(assignment.botType, assignment.markLevel)}
          </Text>
          <Text style={styles.assignmentText}>
            {assignment.quantity} ASSIGNED
          </Text>
        </View>
      )}
      {isEnemy && <Text style={styles.scanErrorText}>[scan error]</Text>}
    </>
  ), [textStyle, name, assignment, isEnemy, isLocked]);

  if (isLocked && !isEnemy) {
    return (
      <View style={slotStyle}>
        <Text style={textStyle}>BATTALION {name}</Text>
        <Text style={deployTextStyle}>+ Deploy</Text>
        <Text style={styles.lockText}>🔒</Text>
      </View>
    );
  }

  return isEnemy ? (
    <View style={slotStyle}>
      {isHighlighted && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: 3,
              borderColor: animatedBorderColorValue,
              borderRadius: 4,
            }
          ]} 
          pointerEvents="none"
        />
      )}
      {content}
    </View>
  ) : (
    <TouchableOpacity
      style={slotStyle}
      onPress={onPress}
      disabled={isLocked || isEnemy || disabled}
    >
      {isHighlighted && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: 3,
              borderColor: animatedBorderColorValue,
              borderRadius: 4,
            }
          ]} 
          pointerEvents="none"
        />
      )}
      {content}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  slot: {
    height: 80,
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSlot: {
    borderColor: '#4717F6',
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
  },
  lockedSlot: {
    borderColor: 'rgba(71, 23, 246, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  enemySlot: {
    borderColor: '#FF4141',
    backgroundColor: 'rgba(255, 65, 65, 0.1)',
  },
  lockedEnemySlot: {
    borderColor: 'rgba(255, 65, 65, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  slotText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  enemyText: {
    color: '#FF4141',
  },
  deployText: {
    color: '#4717F6',
    fontSize: SIZING.font.small,
    marginTop: 4,
  },
  lockedText: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  lockText: {
    position: 'absolute',
    right: SIZING.spacing.sm,
    top: SIZING.spacing.sm,
    fontSize: SIZING.font.small,
  },
  scanErrorText: {
    color: 'rgba(255, 65, 65, 0.5)',
    fontSize: SIZING.font.small,
    marginTop: 4,
  },
  assignmentInfo: {
    alignItems: 'center',
    marginTop: 4,
  },
  assignmentText: {
    color: '#4717F6',
    fontSize: 14,
    textAlign: 'center',
  },
});
