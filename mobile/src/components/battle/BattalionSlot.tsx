import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

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
};

export const BattalionSlot = React.memo(({ 
  name, 
  isLocked = false,
  isEnemy = false,
  onPress,
  assignment 
}: Props) => {
  const slotStyle = [
    styles.slot,
    isEnemy ? styles.enemySlot : styles.activeSlot,
    isLocked && (isEnemy ? styles.lockedEnemySlot : styles.lockedSlot)
  ];

  const textStyle = [
    styles.slotText,
    isEnemy && styles.enemyText,
    isLocked && styles.lockedText
  ];

  if (isLocked && !isEnemy) {
    return (
      <View style={slotStyle}>
        <Text style={textStyle}>BATTALION {name}</Text>
        <Text style={[styles.deployText, styles.lockedText]}>+ Deploy</Text>
        <Text style={styles.lockText}>🔒</Text>
      </View>
    );
  }

  const content = (
    <>
      <Text style={textStyle}>BATTALION {name}</Text>
      {!assignment ? (
        !isEnemy && !isLocked && <Text style={styles.deployText}>+ Deploy</Text>
      ) : (
        <View style={styles.assignmentInfo}>
          <Text style={styles.assignmentText}>
            {assignment.botType.toUpperCase()} MK {toRomanNumeral(assignment.markLevel)}
          </Text>
          <Text style={styles.assignmentText}>
            {assignment.quantity} ASSIGNED
          </Text>
        </View>
      )}
    </>
  );

  return isEnemy ? (
    <View style={slotStyle}>{content}</View>
  ) : (
    <TouchableOpacity 
      style={slotStyle}
      onPress={onPress}
      disabled={isLocked || isEnemy}
    >
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

// Helper function for Roman numerals
const toRomanNumeral = (num: number): string => {
  const romanNumerals = ['I', 'II', 'III', 'IV'];
  return romanNumerals[num - 1] || '';
}; 