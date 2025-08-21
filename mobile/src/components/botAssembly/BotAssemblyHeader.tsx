import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useResponsiveDimensions } from '../../hooks/useResponsiveDimensions';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Balance } from '../common/Balance';
import { CloseButton } from '../common/CloseButton';

type BotAssemblyHeaderProps = {
  onClose: () => void;
};

export const BotAssemblyHeader = React.memo(function BotAssemblyHeader({
  onClose,
}: BotAssemblyHeaderProps) {
  const { isSmallDevice } = useResponsiveDimensions();
  const colors = useThemeColors();
  
  return (
    <>
      <CloseButton onPress={onClose} />
      <View style={[styles.header, isSmallDevice && styles.smallDeviceHeader]}>
        <Balance />
        <Text style={[styles.title, isSmallDevice && styles.smallDeviceTitle, { color: colors.text.primary }]}>BOT_ASSEMBLY</Text>
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
  smallDeviceHeader: {
    height: 80,
    paddingBottom: 8,
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  smallDeviceTitle: {
    fontSize: SIZING.font.body,
    letterSpacing: 1,
  },
});
