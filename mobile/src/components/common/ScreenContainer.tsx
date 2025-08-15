import React from 'react';
import { SafeAreaView, View, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { COLORS } from '../../styles/theme';

type Props = {
  children: React.ReactNode;
};

export const ScreenContainer = ({ children }: Props) => (
  <SafeAreaView style={styles.safeArea}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
