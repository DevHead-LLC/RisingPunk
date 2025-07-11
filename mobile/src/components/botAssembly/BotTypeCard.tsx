import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type BotTypeCardProps = {
  type: string;
  level: number;
  isLocked: boolean;
  isSelected: boolean;
  count?: number;
  onPress: () => void;
};

export const BotTypeCard = React.memo(function BotTypeCard({
  type,
  level,
  isLocked,
  isSelected,
  count,
  onPress,
}: BotTypeCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.botCard,
        isLocked && styles.botCardLocked,
        isSelected && styles.botCardSelected,
      ]}
      onPress={onPress}
      disabled={isLocked}
    >
      <View style={styles.botCardContent}>
        <Text style={styles.botType}>{type.toUpperCase()}</Text>
        {!isLocked ? (
          <Text style={styles.botCount}>
            Owned: {count}
          </Text>
        ) : (
          <Text style={styles.lockedText}>🔒 LOCKED</Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  botCard: {
    width: '100%',
    padding: SIZING.spacing.md,
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  botCardLocked: {
    opacity: 0.5,
    backgroundColor: 'rgba(26, 77, 51, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  botCardSelected: {
    backgroundColor: 'rgba(26, 77, 51, 0.6)',
    borderColor: 'rgba(0, 255, 65, 0.8)',
  },
  botType: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  botCount: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
  },
  lockedText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  botCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
