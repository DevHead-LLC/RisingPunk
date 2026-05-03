import React, { memo, useEffect, useRef } from 'react';
import { TouchableOpacity, View, Image, StyleSheet, Animated } from 'react-native';
import { SIZING } from '../../styles/theme';

/** Match `DailyHaulLocation` vertical stack under profile (right-hand column). */
const PROFILE_HEIGHT = 60;
const GAP_BELOW_PROFILE = 16;
const DAILY_BUTTON_SIZE = 48;
const CENTER_OFFSET = (PROFILE_HEIGHT - DAILY_BUTTON_SIZE) / 2;
const BLACK_HAT_SIZE = 48;
const GAP_BELOW_DAILY_HAUL = 8;

type Props = {
  onPress: () => void;
  /** When true, background behind icon stands out until the user opens Black Hat Patch today. */
  hasUnread: boolean;
  rightInset?: number;
};

export const BlackHatPatchLocation = memo(function BlackHatPatchLocation({
  onPress,
  hasUnread,
  rightInset = 0,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hasUnread) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [hasUnread, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const dailyHaulTop = SIZING.spacing.lg + PROFILE_HEIGHT + GAP_BELOW_PROFILE;
  const blackHatTop = dailyHaulTop + DAILY_BUTTON_SIZE + GAP_BELOW_DAILY_HAUL;

  return (
    <View
      style={[styles.wrap, { top: blackHatTop, right: SIZING.spacing.lg + CENTER_OFFSET + rightInset }]}
      pointerEvents="box-none"
    >
      {hasUnread ? (
        <Animated.View
          style={[
            styles.unreadPad,
            {
              transform: [{ scale }],
            },
          ]}
          pointerEvents="none"
        />
      ) : null}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityLabel="Black Hat Patch. Developer support purchases."
        accessibilityRole="button"
      >
        <Image
          source={require('../../assets/images/ui/blackHatPatch.png')}
          style={{ width: BLACK_HAT_SIZE, height: BLACK_HAT_SIZE }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 4,
  },
  unreadPad: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 100, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 120, 0.55)',
    top: -4,
  },
});
