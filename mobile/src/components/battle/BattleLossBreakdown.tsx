import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BattleEndData } from '../../store/api/battleApi';
import { BattalionLossItem } from './BattalionLossItem';

interface Props {
  battleEndData: BattleEndData;
}

export const BattleLossBreakdown: React.FC<Props> = ({ battleEndData }) => {
  const { losses, winner, experienceGained, hackerRewards } = battleEndData;
  
  const userBattalions = losses.battalionLosses.filter(b => b.owner === 'user');
  const enemyBattalions = losses.battalionLosses.filter(b => b.owner === 'enemy');
  
  const getEndConditionDisplay = (condition: string) => {
    return condition === 'timer' ? 'Timer' : 'Elimination';
  };

  const isCompleteVictory = losses.userLosses === 0 || losses.enemyLosses === 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Battle Results</Text>
        <Text style={[styles.victoryMessage, { color: winner === 'user' ? '#4717F6' : '#FF4141' }]}>
          {isCompleteVictory ? 'Complete Victory!' : losses.victoryMessage}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.lossSummary}>
          <Text style={[styles.lossText, { color: '#4717F6' }]}>
            User Losses: {losses.userLosses}
          </Text>
          <Text style={[styles.lossText, { color: '#FF4141' }]}>
            Enemy Losses: {losses.enemyLosses}
          </Text>
        </View>
        
        <View style={styles.battleInfo}>
          <Text style={styles.infoText}>
            Battle Duration: {losses.battleDuration}s
          </Text>
          <Text style={styles.infoText}>
            End Condition: {getEndConditionDisplay(losses.endCondition)}
          </Text>
        </View>
      </View>

      {winner === 'user' && (experienceGained || hackerRewards) && (
        <View style={styles.rewardsSection}>
          <Text style={styles.sectionTitle}>Rewards</Text>
          <View style={styles.rewardsContainer}>
            {experienceGained && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardLabel}>Experience Gained</Text>
                <Text style={styles.rewardValue}>{experienceGained} XP</Text>
              </View>
            )}
            {hackerRewards && (
              <View style={styles.rewardItem}>
                <Text style={styles.rewardLabel}>Hacker Rewards</Text>
                <Text style={styles.rewardValue}>${hackerRewards}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.battalionSection}>
        <Text style={styles.sectionTitle}>Battalion Results</Text>
        
        <View style={styles.userCard}>
          <Text style={[styles.cardTitle, { color: '#4717F6' }]}>User Forces</Text>
          <View style={styles.cardContent}>
            {userBattalions.length > 0 ? (
              userBattalions.map((battalion) => (
                <BattalionLossItem key={battalion.battalionId} battalionLoss={battalion} />
              ))
            ) : (
              <Text style={styles.noBattalions}>No user battalions</Text>
            )}
          </View>
        </View>
        
        <View style={styles.enemyCard}>
          <Text style={[styles.cardTitle, { color: '#FF4141' }]}>Enemy Forces</Text>
          <View style={styles.cardContent}>
            {enemyBattalions.length > 0 ? (
              enemyBattalions.map((battalion) => (
                <BattalionLossItem key={battalion.battalionId} battalionLoss={battalion} />
              ))
            ) : (
              <Text style={styles.noBattalions}>No enemy battalions</Text>
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
    backgroundColor: '#0a0a0a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  title: {
    color: '#ffffff',
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
    color: '#888888',
    fontSize: 16,
  },
  rewardsSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#ffffff',
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
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    minWidth: 120,
    borderWidth: 1,
    borderColor: '#333333',
  },
  rewardLabel: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardValue: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  battalionSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
    marginBottom: 16,
  },
  enemyCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  cardContent: {
    padding: 16,
  },
  noBattalions: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 