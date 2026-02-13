import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NodeOwner } from '../../types/battleTypes';
import { BattleEndData } from '../../store/api/battleApi';
import { BattleLossBreakdown } from './BattleLossBreakdown';
import { LevelUpAnimation } from '../common/LevelUpAnimation';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setUserLevel, refreshUserDataSilent } from '../../store/slices/authSlice';
import { authApi } from '../../store/api/authApi';
import { userGuideApi } from '../../store/api/userGuideApi';
import { balanceApi } from '../../store/api/balanceApi';
import gameCenterService from '../../services/gameCenterService';

interface BattleEndOverlayProps {
  winner: NodeOwner;
  onContinue: () => void;
  battleEndData?: BattleEndData;
}

export const BattleEndOverlay: React.FC<BattleEndOverlayProps> = ({ winner, onContinue, battleEndData }) => {
  const colors = useThemeColors();
  const dispatch = useAppDispatch();
  const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(false);
  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    if (battleEndData?.levelUp && battleEndData.levelUp.levelsGained > 0) {
      setShowLevelUpAnimation(true);
    }
  }, [battleEndData]);

  // When battle ends with a level-up, update auth level from the response so Research Center (and any UI) sees the new level live — no fetch, no refresh. Also invalidate caches for next time profile/tasks are loaded.
  // Refresh auth user silently so unlockedFeatures (e.g. hackRig) updates without triggering app loading state.
  useEffect(() => {
    if (battleEndData) {
      if (battleEndData.levelUp?.newLevel != null) {
        dispatch(setUserLevel(battleEndData.levelUp.newLevel));
      }
      dispatch(authApi.util.invalidateTags(['User']));
      dispatch(refreshUserDataSilent());
      if (battleEndData.levelUp && battleEndData.levelUp.levelsGained > 0) {
        dispatch(userGuideApi.util.invalidateTags(['UserTaskProgress']));
      }
    }
  }, [battleEndData, dispatch]);

  // Submit Game Center scores when battle ends
  useEffect(() => {
    if (battleEndData && token) {
      const submitGameCenterScores = async () => {
        try {
          // Fetch profile to get latest stats
          const profileResult = await dispatch(authApi.endpoints.getProfile.initiate()).unwrap();
          
          // Submit bots destroyed score
          if (profileResult?.battleStats?.botsDestroyed) {
            await gameCenterService.submitBotsDestroyedScore(profileResult.battleStats.botsDestroyed);
          }
          
          // Submit lifetime net worth score if it was updated during battle
          // Use battleEndData flag first (most reliable), fallback to balance API check
          if (battleEndData.lifetimeHighUpdated) {
            const balanceResult = await dispatch(balanceApi.endpoints.fetchBalance.initiate()).unwrap();
            if (balanceResult?.lifetimeHighNetWorth !== undefined) {
              // Force submission after battle since this is a significant event
              // Server already checked database during battle rewards, so we can bypass throttling
              await gameCenterService.submitLifetimeNetWorthScore(balanceResult.lifetimeHighNetWorth, true);
            }
          }
        } catch (error) {
          // Silently fail - Game Center is optional
        }
      };
      submitGameCenterScores();
    }
  }, [battleEndData, token, dispatch]);

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
      onContinue();
    } catch (error) {
      console.error('❌ Error in handleContinue:', error);
    }
  };

  if (battleEndData) {
    return (
      <View style={[styles.overlay, { backgroundColor: colors.background + 'E6' }]} testID="battle-end-overlay">
        <LevelUpAnimation
          isVisible={showLevelUpAnimation}
          onAnimationComplete={handleLevelUpAnimationComplete}
        />
        <View style={[styles.container, { backgroundColor: colors.accent, borderColor: colors.neutral }]}>
          <View style={styles.contentContainer}>
            <BattleLossBreakdown battleEndData={battleEndData} />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.continueButton, { backgroundColor: colors.buttonBg }]} onPress={handleContinue} testID="continue-button">
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background + 'E6' }]} testID="battle-end-overlay">
      <LevelUpAnimation
        isVisible={showLevelUpAnimation}
        onAnimationComplete={handleLevelUpAnimationComplete}
      />
      <View style={[styles.container, { backgroundColor: colors.accent, borderColor: colors.neutral }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>BATTLE COMPLETE</Text>
        <Text style={[styles.winnerText, { color: colors.matrix }]} testID="winner-display">
          {getWinnerText()}
        </Text>
        <TouchableOpacity style={[styles.continueButton, { backgroundColor: colors.buttonBg }]} onPress={handleContinue} testID="continue-button">
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    borderRadius: 16,
    padding: 0,
    margin: 16,
    borderWidth: 2,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  winnerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  continueButton: {
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