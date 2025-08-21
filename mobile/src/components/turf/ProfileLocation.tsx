import React, {memo} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet} from 'react-native';
import {SIZING} from '../../styles/theme';
import {useThemeColors} from '../../hooks/useThemeColors';

type ProfileLocationProps = {
  onPress: () => void;
};

export const ProfileLocation = memo(function ProfileLocation({ onPress }: ProfileLocationProps) {
  const colors = useThemeColors();

  return (
    <TouchableOpacity
      style={[styles.location, styles.profilePosition, { borderColor: colors.primary }]}
      onPress={onPress}
    >
      <View style={styles.profileContainer}>
        <Image
          source={require('../../assets/images/profile.png')}
          style={styles.locationIcon}
        />
      </View>
      <Text style={[styles.profileLabel, { color: colors.primary }]}>PROFILE</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  location: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 3,
  },
  profileContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  locationIcon: {
    width: 60,
    height: 60,
  },
  profilePosition: {
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
  },
  profileLabel: {
    fontSize: SIZING.font.small,
    letterSpacing: 1,
    position: 'absolute',
    bottom: -30,
    width: 80,
    textAlign: 'center',
  },
});
