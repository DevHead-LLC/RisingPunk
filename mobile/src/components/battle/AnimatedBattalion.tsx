import React from 'react';
import { Animated, StyleSheet, View, Text } from 'react-native';

type Props = {
  type: 'breacher' | 'guardian' | 'phreak';
  quantity: number;
  position: Animated.ValueXY;
  isUser: boolean;
  health?: number;
};

export const AnimatedBattalion = React.memo(({ type, quantity, position, isUser, health = 100 }: Props) => {
  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x,
          top: position.y,
        }
      ]}
    >
      <View style={styles.healthBarContainer}>
        <View style={[styles.healthBar, { width: `${health}%` }]} />
      </View>
      
      <View style={[
        styles.battalion,
        styles[type],
        isUser ? styles.userBattalion : styles.enemyBattalion
      ]}>
        <Text style={[
          styles.quantityText,
          type === 'breacher' && styles.rotatedText
        ]}>
          {quantity}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  healthBarContainer: {
    position: 'absolute',
    top: -9,
    width: '100%',
    height: 2,
    backgroundColor: '#333333',
    borderRadius: 1,
  },
  healthBar: {
    height: '100%',
    backgroundColor: '#00FF00',
    borderRadius: 1,
  },
  battalion: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  userBattalion: {
    borderColor: '#4717F6',
  },
  enemyBattalion: {
    borderColor: '#FF4141',
  },
  breacher: {
    transform: [{ rotate: '45deg' }],
  },
  guardian: {
    borderRadius: 4,
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