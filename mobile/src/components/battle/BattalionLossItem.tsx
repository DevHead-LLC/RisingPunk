import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BattalionLoss } from '../../store/api/battleApi';

interface Props {
  battalionLoss: BattalionLoss;
}

export const BattalionLossItem: React.FC<Props> = ({ battalionLoss }) => {
  const getBotTypeDisplay = (type: string, mark: number) => {
    const typeNames = {
      guardian: 'Guardian',
      breacher: 'Breacher',
      phreak: 'Phreak'
    };
    return `${typeNames[type as keyof typeof typeNames]} Mk ${mark === 1 ? 'I' : mark === 2 ? 'II' : mark === 3 ? 'III' : 'IV'}`;
  };

  const borderColor = battalionLoss.owner === 'user' ? '#4717F6' : '#FF4141';
  const isDestroyed = battalionLoss.endingQuantity === 0;

  return (
    <View style={[styles.container, { borderLeftColor: borderColor }]} testID="battalion-loss-item">
      <View style={styles.header}>
        <Text style={[styles.botType, isDestroyed && styles.destroyedText]}>
          {getBotTypeDisplay(battalionLoss.type, battalionLoss.mark)}
        </Text>
        <Text style={[styles.owner, { color: borderColor }]}>
          {battalionLoss.owner === 'user' ? 'User' : 'Enemy'}
        </Text>
      </View>
      
      <View style={styles.details}>
        <Text style={[styles.quantity, isDestroyed && styles.destroyedText]}>
          {battalionLoss.startingQuantity} → {battalionLoss.endingQuantity}
        </Text>
        <Text style={[styles.losses, { color: borderColor }]}>
          {battalionLoss.losses} losses
        </Text>
      </View>
      
      <View style={styles.points}>
        <Text style={styles.pointsText}>
          Points: {battalionLoss.startingPoints} → {battalionLoss.endingPoints}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  botType: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  owner: {
    fontSize: 14,
    fontWeight: '600',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quantity: {
    color: '#cccccc',
    fontSize: 14,
  },
  losses: {
    fontSize: 14,
    fontWeight: '600',
  },
  points: {
    marginTop: 4,
  },
  pointsText: {
    color: '#888888',
    fontSize: 12,
  },
  destroyedText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
}); 