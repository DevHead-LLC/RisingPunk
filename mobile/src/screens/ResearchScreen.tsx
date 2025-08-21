import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { useThemeColors } from '../hooks/useThemeColors';

type ResearchScreenProps = {
  onClose: () => void;
};

export function ResearchScreen({ onClose }: ResearchScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  
  const styles = createStyles(colors);
  
  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.content}>
        <Text style={styles.researchText}>Research Stuff</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  researchText: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    textAlign: 'center',
  },
});
