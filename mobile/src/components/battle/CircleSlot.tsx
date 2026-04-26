import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType } from 'react-native';
import { SIZING } from '../../styles/theme';

type Props = {
  isEnemy?: boolean;
  isEnabled?: boolean;
  isFilled?: boolean;
  label?: string;
  filledLabel?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
};

export const CircleSlot = React.memo(
  ({
    isEnemy = false,
    isEnabled = false,
    isFilled = false,
    label,
    filledLabel,
    imageSource,
    onPress,
  }: Props) => {
  const containerStyle = React.useMemo(() => [
    styles.container, 
    isEnemy && styles.enemyCircle,
    !isEnemy && isEnabled && styles.enabledCircle,
    !isEnemy && isFilled && styles.filledCircle,
  ], [isEnemy, isEnabled, isFilled]);

  const textStyle = React.useMemo(() => [
    styles.lockText, 
    isEnemy && styles.enemyText,
    !isEnemy && isEnabled && styles.enabledText,
  ], [isEnemy, isEnabled]);

  const effectiveLabel = isEnemy
    ? '???'
    : (isFilled ? (filledLabel ?? 'SET') : (label ?? (isEnabled ? 'EMPTY' : 'LOCK')));

  const content = (
    <View style={containerStyle}>
      {isFilled && imageSource ? <Image source={imageSource} style={styles.slotImage} resizeMode="contain" /> : null}
      <Text style={textStyle}>
        {effectiveLabel}
      </Text>
    </View>
  );

  if (isEnemy || !onPress) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      {content}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(71, 23, 246, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    overflow: 'hidden',
  },
  lockText: {
    fontSize: SIZING.font.small,
  },
  enemyCircle: {
    borderColor: 'rgba(255, 65, 65, 0.3)',
  },
  enabledCircle: {
    borderColor: 'rgba(71, 23, 246, 0.65)',
    backgroundColor: 'rgba(40, 22, 94, 0.42)',
  },
  filledCircle: {
    borderColor: 'rgba(77, 227, 171, 0.9)',
    backgroundColor: 'rgba(29, 80, 67, 0.45)',
  },
  enemyText: {
    color: 'rgba(255, 65, 65, 0.5)',
  },
  enabledText: {
    color: 'rgba(210, 218, 255, 0.95)',
    fontWeight: '700',
  },
  slotImage: {
    position: 'absolute',
    width: 54,
    height: 54,
    top: 1,
    borderRadius: 27,
  },
});
