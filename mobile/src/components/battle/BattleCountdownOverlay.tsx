import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

type Props = {
  countdown: number;
  isVisible: boolean;
};

export const BattleCountdownOverlay = React.memo(({ countdown, isVisible }: Props) => {
  const colors = useThemeColors();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.5)).current;

  const containerStyle = React.useMemo(() => [
    styles.container, 
    { opacity }
  ], [opacity]);

  const countdownContainerStyle = React.useMemo(() => [
    styles.countdownContainer, 
    { transform: [{ scale }] }
  ], [scale]);

  const startAnimations = React.useCallback(() => {
    const animations = [
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      isVisible 
        ? Animated.spring(scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
        : Animated.timing(scale, { toValue: 0.5, duration: 200, useNativeDriver: true })
    ];
    
    Animated.parallel(animations).start();
  }, [isVisible, opacity, scale]);

  React.useEffect(() => {
    startAnimations();
  }, [startAnimations]);

  if (!isVisible) return null;

  return (
    <Animated.View style={containerStyle}>
      <View style={[styles.overlay, { backgroundColor: colors.background + 'CC' }]}>
        <Animated.View style={countdownContainerStyle}>
          <Text style={[styles.countdownText, { color: colors.secondary }]}>{countdown}</Text>
          <Text style={[styles.countdownLabel, { color: colors.text.primary }]}>BATTLE STARTING</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  countdownLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
