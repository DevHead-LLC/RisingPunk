import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BattleEndData } from '../../store/api/battleApi';
import { BattalionLossItem } from './BattalionLossItem';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  battleEndData: BattleEndData;
}

export const BattleLossBreakdown: React.FC<Props> = ({ battleEndData }) => {
  const colors = useThemeColors();
  const { losses, winner, experienceGained, hackerRewards, isUserDefender } = battleEndData;
  
  const userBattalions = losses.battalionLosses.filter(b => b.owner === 'user');
  const enemyBattalions = losses.battalionLosses.filter(b => b.owner === 'enemy');
  
  const getEndConditionDisplay = (condition: string) => {
    return condition === 'timer' ? 'Timer' : 'Elimination';
  };

  const isCompleteVictory = losses.userLosses === 0 || losses.enemyLosses === 0;

  const calculateBotQuantityLosses = (battalions: typeof losses.battalionLosses): number => {
    return battalions.reduce((total, battalion) => {
      return total + (battalion.startingQuantity - battalion.endingQuantity);
    }, 0);
  };

  const attackerBotsLost = calculateBotQuantityLosses(userBattalions);
  const defenderBotsLost = calculateBotQuantityLosses(enemyBattalions);
  const isUserVsUser = isUserDefender === true;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>Battle Results</Text>
        <Text style={[styles.victoryMessage, { color: winner === 'user' ? colors.secondary : colors.error }]}>
          {isCompleteVictory ? 'Complete Victory!' : losses.victoryMessage}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.lossSummary}>
          <Text style={[styles.lossText, { color: colors.secondary }]}>
            User Losses: {losses.userLosses}
          </Text>
          <Text style={[styles.lossText, { color: colors.error }]}>
            Enemy Losses: {losses.enemyLosses}
          </Text>
        </View>
        
        <View style={styles.battleInfo}>
          <Text style={[styles.infoText, { color: colors.neutral }]}>
            Battle Duration: {losses.battleDuration}s
          </Text>
          <Text style={[styles.infoText, { color: colors.neutral }]}>
            End Condition: {getEndConditionDisplay(losses.endCondition)}
          </Text>
        </View>
      </View>

      {isUserVsUser && (
        <View style={styles.botLossesSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Bot Losses</Text>
          <View style={styles.botLossesContainer}>
            <View style={[styles.botLossItem, { backgroundColor: colors.accent, borderColor: colors.secondary }]}>
              <Text style={[styles.botLossLabel, { color: colors.neutral }]}>Attacker's Losses</Text>
              <Text style={[styles.botLossValue, { color: colors.matrix }]}>{attackerBotsLost}</Text>
            </View>
            <View style={[styles.botLossItem, { backgroundColor: colors.accent, borderColor: colors.error }]}>
              <Text style={[styles.botLossLabel, { color: colors.neutral }]}>Defender's Losses</Text>
              <Text style={[styles.botLossValue, { color: colors.matrix }]}>{defenderBotsLost}</Text>
            </View>
          </View>
        </View>
      )}

      {winner === 'user' && (experienceGained || hackerRewards) && (
        <View style={styles.rewardsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Rewards</Text>
          <View style={styles.rewardsContainer}>
            {experienceGained && (
              <View style={[styles.rewardItem, { backgroundColor: colors.accent, borderColor: colors.neutral }]}>
                <Text style={[styles.rewardLabel, { color: colors.neutral }]}>Experience Gained</Text>
                <Text style={[styles.rewardValue, { color: colors.matrix }]}>{experienceGained} XP</Text>
              </View>
            )}
            {hackerRewards && (
              <View style={[styles.rewardItem, { backgroundColor: colors.accent, borderColor: colors.neutral }]}>
                <Text style={[styles.rewardLabel, { color: colors.neutral }]}>Hacker Rewards</Text>
                <Text style={[styles.rewardValue, { color: colors.matrix }]}>${hackerRewards}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.battalionSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Battalion Results</Text>
        
        <View style={[styles.userCard, { backgroundColor: colors.accent, borderColor: colors.neutral }]}>
          <Text style={[styles.cardTitle, { color: colors.secondary, borderBottomColor: colors.neutral }]}>User Forces</Text>
          <View style={styles.cardContent}>
            {userBattalions.length > 0 ? (
              userBattalions.map((battalion) => (
                <BattalionLossItem key={battalion.battalionId} battalionLoss={battalion} />
              ))
            ) : (
              <Text style={[styles.noBattalions, { color: colors.neutral }]}>No user battalions</Text>
            )}
          </View>
        </View>
        
        <View style={[styles.enemyCard, { backgroundColor: colors.accent, borderColor: colors.neutral }]}>
          <Text style={[styles.cardTitle, { color: colors.error, borderBottomColor: colors.neutral }]}>Enemy Forces</Text>
          <View style={styles.cardContent}>
            {enemyBattalions.length > 0 ? (
              enemyBattalions.map((battalion) => (
                <BattalionLossItem key={battalion.battalionId} battalionLoss={battalion} />
              ))
            ) : (
              <Text style={[styles.noBattalions, { color: colors.neutral }]}>No enemy battalions</Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  victoryMessage: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  summary: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  lossSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  lossText: {
    fontSize: 18,
    fontWeight: '600',
  },
  battleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: {
    fontSize: 16,
  },
  rewardsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rewardItem: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: 120,
    borderWidth: 1,
  },
  rewardLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  battalionSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  enemyCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
  },
  cardContent: {
    padding: 16,
  },
  noBattalions: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  botLossesSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  botLossesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  botLossItem: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: 140,
    borderWidth: 1,
    flex: 1,
  },
  botLossLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  botLossValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 