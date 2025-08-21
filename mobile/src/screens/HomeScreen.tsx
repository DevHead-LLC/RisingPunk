import React, {memo} from 'react';
import {View, StyleSheet} from 'react-native';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { HackRigDisplay } from '../components/home/HackRigDisplay';
import { BotAssembly } from '../components/home/BotAssembly';
import { useThemeColors } from '../hooks/useThemeColors';

type HomeScreenProps = {
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToBotAssembly: () => void;
  onNavigateToBattle: () => void;
};

export const HomeScreen = memo(function HomeScreen({
  onClose,
  onNavigateToMap,
  onNavigateToBotAssembly,
  onNavigateToBattle,
}: HomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onClose} />
      <View style={styles.content}>
        <HackRigDisplay
          onPress={onNavigateToMap}
          onNavigateToBattle={onNavigateToBattle}
        />
        <BotAssembly onPress={onNavigateToBotAssembly} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
  },
});
