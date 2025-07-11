import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';

type Props = {
  isEnemy?: boolean;
};

export const CircleSlot = React.memo(({ isEnemy = false }: Props) => {
  return (
    <View style={[styles.container, isEnemy && styles.enemyCircle]}>
      <Text style={[styles.lockText, isEnemy && styles.enemyText]}>
        {isEnemy ? '???' : '🔒'}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(71, 23, 246, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  lockText: {
    fontSize: SIZING.font.small,
  },
  enemyCircle: {
    borderColor: 'rgba(255, 65, 65, 0.3)',
  },
  enemyText: {
    color: 'rgba(255, 65, 65, 0.5)',
  },
});
