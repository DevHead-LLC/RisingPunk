import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NodeOwner } from '../../types/battleTypes';
import { BattleEndData } from '../../store/api/battleApi';
import { BattleLossBreakdown } from './BattleLossBreakdown';
import { LevelUpAnimation } from '../common/LevelUpAnimation';

interface BattleEndOverlayProps {
  winner: NodeOwner;
  onContinue: () => void;
  battleEndData?: BattleEndData;
}

export const BattleEndOverlay: React.FC<BattleEndOverlayProps> = ({ winner, onContinue, battleEndData }) => {
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);

  useEffect(() => {
    if (battleEndData?.levelUp && battleEndData.levelUp.levelsGained > 0) {
      setShowLevelUpAnimation(true);
    }
  }, [battleEndData]);

  const handleLevelUpAnimationComplete = () => {
    setShowLevelUpAnimation(false);
  };



  const getWinnerText = () => {
    try {
      return winner === NodeOwner.USER ? 'User Wins!' : 'Enemy Wins!';
    } catch (error) {
      console.error('❌ Error in getWinnerText:', error);
      return 'Battle Complete!';
    }
  };

  const handleContinue = () => {
    try {
      console.log('🔍 Continue button pressed, calling onContinue');
      onContinue();
    } catch (error) {
      console.error('❌ Error in handleContinue:', error);
    }
  };

  if (battleEndData) {
    return (
      <View style={styles.overlay} testID="battle-end-overlay">
        <LevelUpAnimation
          isVisible={showLevelUpAnimation}
          onAnimationComplete={handleLevelUpAnimationComplete}
        />
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            <BattleLossBreakdown battleEndData={battleEndData} />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue} testID="continue-button">
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay} testID="battle-end-overlay">
      <LevelUpAnimation
        isVisible={showLevelUpAnimation}
        onAnimationComplete={handleLevelUpAnimationComplete}
      />
      <View style={styles.container}>
        <Text style={styles.title}>BATTLE COMPLETE</Text>
        <Text style={styles.winnerText} testID="winner-display">
          {getWinnerText()}
        </Text>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} testID="continue-button">
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 0,
    margin: 16,
    borderWidth: 2,
    borderColor: '#333333',
    flex: 1,
    maxHeight: '95%',
    minHeight: '80%',
    width: '95%',
  },
  contentContainer: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  winnerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 30,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
}); 