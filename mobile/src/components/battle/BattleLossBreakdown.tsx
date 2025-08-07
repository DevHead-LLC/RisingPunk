import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BattleEndData } from '../../store/api/battleApi';
import { BattalionLossItem } from './BattalionLossItem';

interface Props {
  battleEndData: BattleEndData;
}

export const BattleLossBreakdown: React.FC<Props> = ({ battleEndData }) => {
  const { losses, winner } = battleEndData;
  
  const userBattalions = losses.battalionLosses.filter(b => b.owner === 'user');
  const enemyBattalions = losses.battalionLosses.filter(b => b.owner === 'enemy');
  
  const getEndConditionDisplay = (condition: string) => {
    return condition === 'timer' ? 'Timer' : 'Elimination';
  };

  const isCompleteVictory = losses.userLosses === 0 || losses.enemyLosses === 0;

  return (
    <View style={styles.container}>
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

      <View style={styles.battalionSection}>
        <Text style={styles.sectionTitle}>Battalion Losses</Text>
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {userBattalions.length > 0 && (
            <View style={styles.sideSection}>
              <Text style={[styles.sideTitle, { color: '#4717F6' }]}>User Battalions</Text>
              {userBattalions.map((battalion) => (
                <BattalionLossItem key={battalion.battalionId} battalionLoss={battalion} />
              ))}
            </View>
          )}
          
          {enemyBattalions.length > 0 && (
            <View style={styles.sideSection}>
              <Text style={[styles.sideTitle, { color: '#FF4141' }]}>Enemy Battalions</Text>
              {enemyBattalions.map((battalion) => (
                <BattalionLossItem key={battalion.battalionId} battalionLoss={battalion} />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  victoryMessage: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  summary: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  lossSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lossText: {
    fontSize: 16,
    fontWeight: '600',
  },
  battleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: {
    color: '#888888',
    fontSize: 14,
  },
  battalionSection: {
    flex: 1,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  sideSection: {
    marginBottom: 16,
  },
  sideTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
}); 