import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SIZING } from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  side: 'user' | 'enemy';
  battalions: Array<{
    type: 'breacher' | 'guardian' | 'phreak';
    quantity: number;
  }>;
};

export const BattalionDeploymentZone = React.memo(({ side, battalions }: Props) => {
  return (
    <View style={[
      styles.container,
      side === 'user' ? styles.userZone : styles.enemyZone
    ]}>
      {battalions.map((battalion, index) => (
        <View key={index} style={styles.battalionContainer}>
          <View 
            style={[
              styles.battalionIndicator,
              styles[battalion.type],
              side === 'enemy' && styles.battalionIndicatorEnemy
            ]}
          >
            <Text style={[
              styles.quantityText,
              battalion.type === 'breacher' && styles.rotatedText
            ]}>
              {battalion.quantity}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    height: SCREEN_HEIGHT * 0.65,
    width: 60,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userZone: {
    left: 0,
    top: SCREEN_HEIGHT * 0.2,
    bottom: SCREEN_HEIGHT * 0.1,
  },
  enemyZone: {
    right: 0,
    top: SCREEN_HEIGHT * 0.2,
    bottom: SCREEN_HEIGHT * 0.1,
  },
  battalionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  battalionIndicator: {
    width: 40,
    height: 40,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4717F6',
  },
  battalionIndicatorEnemy: {
    borderColor: '#FF4141',
  },
  breacher: {
    transform: [{ rotate: '45deg' }],
  },
  guardian: {
    // Square shape is default
  },
  phreak: {
    borderRadius: 20,
  },
  quantityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rotatedText: {
    transform: [{ rotate: '-45deg' }]
  }
}); 