import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING, styleGuide } from '../../styles/theme';
import { LightModeToggle } from './LightModeToggle';
import { useThemeColors } from '../../hooks/useThemeColors';

export function TitleSection(): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.titleWrapper}>
          <Text style={[styles.titleTop, { color: colors.primary }]}>Ri</Text>
          <Text style={[styles.dollarSign, { color: colors.matrix }]}>$</Text>
          <Text style={[styles.titleTop, { color: colors.primary }]}>ing</Text>
        </View>
        <Text style={[styles.titleBottom, { color: colors.secondary }]}>Punk</Text>
        <View style={styles.taglineContainer}>
          <Text style={[styles.taglineText, { color: colors.text.primary }]}>
            Earn money... or be a <Text style={[styles.punkText, { color: colors.text.accent }]}>Punk?!</Text>
          </Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <Text style={[styles.versionText, { color: colors.text.secondary }]}>ALPHA_0.1.0</Text>
        <LightModeToggle />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    position: 'relative',
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleTop: {
    fontSize: SIZING.font.h1,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  dollarSign: {
    fontSize: SIZING.font.h1 - 16,
    fontWeight: 'bold',
    marginTop: SIZING.spacing.sm,
    ...styleGuide.matrixGlow,
  },
  titleBottom: {
    fontSize: SIZING.font.h1,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: -15,
  },
  taglineContainer: {
    marginTop: SIZING.spacing.sm,
    marginLeft: SIZING.spacing.xs,
  },
  taglineText: {
    fontSize: SIZING.font.body,
    opacity: 0.8,
  },
  punkText: {
    fontWeight: '600',
  },
  bottomRow: {
    position: 'absolute',
    bottom: '5%',
    left: '5%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionText: {
    fontSize: SIZING.font.small,
    opacity: 0.7,
  },
});
