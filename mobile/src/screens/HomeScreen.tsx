import React, {memo} from 'react';
import {View, StyleSheet} from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { HackRigDisplay } from '../components/home/HackRigDisplay';
import { BotAssembly } from '../components/home/BotAssembly';

type HomeScreenProps = {
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToBotAssembly: () => void;
};

export function HomeScreen({ 
  onClose, 
  onNavigateToMap,
  onNavigateToBotAssembly 
}: HomeScreenProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.content}>
        <HackRigDisplay onPress={onNavigateToMap} />
        <BotAssembly onPress={onNavigateToBotAssembly} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
  },
}); 