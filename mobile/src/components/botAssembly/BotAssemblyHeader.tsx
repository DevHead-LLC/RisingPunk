import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';
import { Balance } from '../common/Balance';
import { CloseButton } from '../common/CloseButton';

type BotAssemblyHeaderProps = {
  onClose: () => void;
};

export const BotAssemblyHeader = React.memo(function BotAssemblyHeader({
  onClose,
}: BotAssemblyHeaderProps) {
  return (
    <>
      <CloseButton onPress={onClose} />
      <View style={styles.header}>
        <Balance />
        <Text style={styles.title}>BOT_ASSEMBLY</Text>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  header: {
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});
