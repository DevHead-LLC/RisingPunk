import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { COLORS, SIZING } from '../styles/theme';
import { useAuth } from '../context/AuthContext';

type Props = {
  onClose: () => void;
};

export const BattlePreparationScreen = ({ onClose }: Props) => {
  const { unlockHackRig } = useAuth();

  const handleTempUnlock = async () => {
    try {
      await unlockHackRig();
      onClose();
    } catch (error) {
      console.error('Failed to unlock hack rig:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <Text style={styles.title}>Battle Preparation</Text>
      
      {/* Temporary unlock button - will be replaced with battle system */}
      <TouchableOpacity 
        onPress={handleTempUnlock}
        style={styles.tempButton}
      >
        <Text style={styles.tempButtonText}>🔓 Temp Unlock</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: SIZING.font.h1,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginTop: SIZING.spacing.lg,
  },
  tempButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 5,
  },
  tempButtonText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
  }
}); 