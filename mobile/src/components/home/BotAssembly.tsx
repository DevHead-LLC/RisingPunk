import React, {memo} from 'react';
import {View, StyleSheet, TouchableOpacity, Image, Text} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

type BotAssemblyProps = {
  onPress: () => void;
};

export const BotAssembly = memo(function BotAssembly({ onPress }: BotAssemblyProps) {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity style={[styles.moduleContainer, { 
      backgroundColor: colors.accent + 'E6',
      borderColor: colors.secondary 
    }]} onPress={onPress}>
      <View style={[styles.imageContainer, { 
        backgroundColor: colors.inputBg + '4D',
        borderColor: colors.matrix 
      }]}>
        <Image
          source={require('../../assets/images/bot-making.png')}
          style={styles.moduleImage}
        />
      </View>
      <View style={styles.moduleTextContainer}>
        <Text style={[styles.moduleTitle, { color: colors.primary }]}>BOT ASSEMBLY</Text>
        <Text style={[styles.moduleDescription, { color: colors.text.secondary }]}>Build your army</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  moduleContainer: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    borderWidth: 2,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 4,
    marginBottom: SIZING.spacing.sm,
    borderWidth: 1,
    padding: SIZING.spacing.xs,
  },
  moduleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  moduleTextContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  moduleTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  moduleDescription: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
});
