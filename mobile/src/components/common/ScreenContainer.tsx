import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';

type Props = {
  children: React.ReactNode;
};

export const ScreenContainer = ({ children }: Props) => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      {children}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: SIZING.screen.padding.horizontal,
    paddingVertical: SIZING.screen.padding.vertical,
  }
}); 