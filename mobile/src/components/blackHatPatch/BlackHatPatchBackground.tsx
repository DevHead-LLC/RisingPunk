import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
/** Subset of theme used for decor (avoid coupling to full `useThemeColors` shape). */
export type BlackHatPatchBackgroundColors = {
  matrix?: string;
  secondary?: string;
  text?: { secondary?: string };
};

type Props = {
  colors: BlackHatPatchBackgroundColors;
  /** Vertical scroll offset for subtle parallax on the pattern layer. */
  scrollY: SharedValue<number>;
};

/** Static dot positions (normalized 0–1) — small repeating field, distinct from Exchange beams. */
const DOTS: { x: number; y: number }[] = (() => {
  const rows = 7;
  const cols = 9;
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const stagger = (r % 2) * 0.055;
      out.push({
        x: 0.06 + (c / (cols - 1)) * 0.88 + stagger,
        y: 0.08 + (r / (rows - 1)) * 0.84,
      });
    }
  }
  return out;
})();

export function BlackHatPatchBackground({ colors, scrollY }: Props) {
  const breathe = useSharedValue(0.55);

  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breathe]);

  const fieldStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + breathe.value * 0.25,
    transform: [{ translateY: scrollY.value * 0.14 }],
  }));

  const meshStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * 0.06 }],
  }));

  const matrixRgb = colors.matrix ?? '#00ff88';
  const secondaryRgb = colors.secondary ?? '#9944ff';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.mesh, meshStyle]} pointerEvents="none">
        <View
          style={[
            styles.meshLine,
            { top: '34%', left: '-45%', backgroundColor: `${matrixRgb}12`, transform: [{ rotate: '17deg' }] },
          ]}
        />
        <View
          style={[
            styles.meshLine,
            { top: '58%', left: '-50%', backgroundColor: `${secondaryRgb}0E`, transform: [{ rotate: '-12deg' }] },
          ]}
        />
        <View
          style={[
            styles.meshLine,
            { top: '78%', left: '-40%', backgroundColor: `${colors.text?.secondary ?? '#888'}0A`, transform: [{ rotate: '7deg' }] },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.dotField, fieldStyle]} pointerEvents="none">
        {DOTS.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                left: `${d.x * 100}%`,
                top: `${d.y * 100}%`,
                backgroundColor: i % 3 === 0 ? `${matrixRgb}55` : i % 3 === 1 ? `${secondaryRgb}40` : `${matrixRgb}28`,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  mesh: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  meshLine: {
    position: 'absolute',
    width: '220%',
    height: 1,
  },
  dotField: {
    ...StyleSheet.absoluteFillObject,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: -2,
    marginTop: -2,
  },
});
