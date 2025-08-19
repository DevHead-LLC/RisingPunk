import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';

type ResearchScreenProps = {
  onClose: () => void;
};

export function ResearchScreen({ onClose }: ResearchScreenProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.content}>
        <Text style={styles.researchText}>Research Stuff</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  researchText: {
    color: COLORS.secondary,
    fontSize: SIZING.font.h2,
    textAlign: 'center',
  },
});
