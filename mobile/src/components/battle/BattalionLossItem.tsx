import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BattalionLoss } from '../../store/api/battleApi';
import { useThemeColors } from '../../hooks/useThemeColors';
import { battleLossTitleFor } from '../../utils/botInventory';
import { BotType } from '../../types/bots';

interface Props {
  battalionLoss: BattalionLoss;
}

export const BattalionLossItem: React.FC<Props> = ({ battalionLoss }) => {
  const colors = useThemeColors();
  
  const borderColor = battalionLoss.owner === 'user' ? colors.secondary : colors.error;
  const isDestroyed = battalionLoss.endingQuantity === 0;
  const losses = battalionLoss.startingQuantity - battalionLoss.endingQuantity;

  return (
    <View style={[styles.container, { borderLeftColor: borderColor, backgroundColor: colors.accent }]} testID="battalion-loss-item">
      <View style={styles.header}>
        <Text style={[styles.botType, { color: colors.text.primary }, isDestroyed && styles.destroyedText]}>
          {battleLossTitleFor(battalionLoss.type as BotType, battalionLoss.mark)}
        </Text>
        <Text style={[styles.owner, { color: borderColor }]}>
          {battalionLoss.owner === 'user' ? 'User' : 'Enemy'}
        </Text>
      </View>
      
      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.neutral }]}>Units:</Text>
          <Text style={[styles.statValue, { color: colors.text.primary }, isDestroyed && styles.destroyedText]}>
            {battalionLoss.startingQuantity} → {battalionLoss.endingQuantity}
          </Text>
          {losses > 0 && (
            <Text style={[styles.losses, { color: borderColor }]}>
              (-{losses})
            </Text>
          )}
        </View>
        
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.neutral }]}>Points:</Text>
          <Text style={[styles.statValue, { color: colors.text.primary }, isDestroyed && styles.destroyedText]}>
            {battalionLoss.startingPoints} → {battalionLoss.endingPoints}
          </Text>
          {battalionLoss.losses > 0 && (
            <Text style={[styles.losses, { color: borderColor }]}>
              (-{battalionLoss.losses})
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  botType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  owner: {
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    gap: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 14,
    minWidth: 50,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  losses: {
    fontSize: 14,
    fontWeight: '600',
  },
  destroyedText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
}); 