import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZING, styleGuide } from '../../styles/theme';

export function TitleSection(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <View style={styles.titleWrapper}>
          <Text style={styles.titleTop}>Ri</Text>
          <Text style={styles.dollarSign}>$</Text>
          <Text style={styles.titleTop}>ing</Text>
        </View>
        <Text style={styles.titleBottom}>Punk</Text>
        <View style={styles.taglineContainer}>
          <Text style={styles.taglineText}>
            Earn money... or be a <Text style={styles.punkText}>Punk?!</Text>
          </Text>
        </View>
      </View>
      <Text style={styles.versionText}>ALPHA_0.1.0</Text>
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
    color: COLORS.primary,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  dollarSign: {
    fontSize: SIZING.font.h1 - 16,
    color: COLORS.matrix,
    fontWeight: 'bold',
    marginTop: SIZING.spacing.sm,
    ...styleGuide.matrixGlow,
  },
  titleBottom: {
    fontSize: SIZING.font.h1,
    color: COLORS.secondary,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginTop: -15,
  },
  taglineContainer: {
    marginTop: SIZING.spacing.sm,
    marginLeft: SIZING.spacing.xs,
  },
  taglineText: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.body,
    opacity: 0.8,
  },
  punkText: {
    color: COLORS.matrix,
    fontWeight: '600',
  },
  versionText: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.small,
    opacity: 0.7,
    position: 'absolute',
    bottom: '5%',
    left: '5%',
  },
}); 