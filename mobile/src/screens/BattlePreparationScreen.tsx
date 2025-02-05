import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { COLORS, SIZING } from '../styles/theme';

type Props = {
  onClose: () => void;
};

export const BattlePreparationScreen = ({ onClose }: Props) => {
  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <Text style={styles.title}>Battle Preparation</Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: SIZING.font.h1,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: SIZING.spacing.lg,
  }
}); 