import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Balance } from '../components/common/Balance';
import { CloseButton } from '../components/common/CloseButton';
import { useBots } from '../context/BotsContext';
import { SIZING } from '../styles/theme';
import { COLORS } from '../styles/theme';

type MarkLevel = 1 | 2 | 3 | 4;
type BotType = 'breacher' | 'guardian' | 'phreak';

const BOT_CATEGORIES = {
  breacher: { role: 'Infantry', stats: { health: 6, defense: 4, offense: 8, range: 2, speed: 7 } },
  guardian: { role: 'Cavalry', stats: { health: 8, defense: 7, offense: 6, range: 3, speed: 5 } },
  phreak: { role: 'Range', stats: { health: 4, defense: 3, offense: 7, range: 8, speed: 4 } }
};

export function DigitalBarracksScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { botCounts } = useBots();
  const [selectedMark, setSelectedMark] = useState<MarkLevel>(1);
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);

  const BotCard = ({ type }: { type: BotType }) => (
    <TouchableOpacity 
      style={[
        styles.botCard,
        selectedBot === type && styles.selectedBotCard
      ]}
      onPress={() => setSelectedBot(type)}
    >
      <View style={styles.botHeader}>
        <Text style={styles.botName}>{type.toUpperCase()}</Text>
        <Text style={styles.botRole}>{BOT_CATEGORIES[type].role}</Text>
      </View>
      
      <View style={styles.botDetails}>
        <View style={styles.countSection}>
          <Text style={styles.countLabel}>Available:</Text>
          <Text style={styles.countValue}>{botCounts[type]}</Text>
          <Text style={styles.countLabel}>Deployed: 0</Text>
        </View>
        
        {selectedBot === type && (
          <View style={styles.statsGrid}>
            {Object.entries(BOT_CATEGORIES[type].stats).map(([stat, value]) => (
              <View key={stat} style={styles.statItem}>
                <Text style={styles.statLabel}>{stat.toUpperCase()}</Text>
                <Text style={styles.statValue}>{value}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const ArmyComposition = () => {
    const total = Object.values(botCounts).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
      <View style={styles.compositionContainer}>
        <View style={styles.barContainer}>
          {Object.entries(botCounts).map(([type, count]) => {
            const percentage = (count / total) * 100;
            return (
              <View
                key={type}
                style={[
                  styles.compositionBar,
                  {
                    width: `${percentage}%`,
                    backgroundColor: 
                      type === 'breacher' ? '#FF4B4B' :
                      type === 'guardian' ? '#4CAF50' :
                      '#2196F3'
                  }
                ]}
              />
            );
          })}
        </View>
        <View style={styles.compositionLegend}>
          {Object.entries(botCounts).map(([type, count]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[
                styles.legendDot,
                {
                  backgroundColor:
                    type === 'breacher' ? '#FF4B4B' :
                    type === 'guardian' ? '#4CAF50' :
                    '#2196F3'
                }
              ]} />
              <Text style={styles.legendText}>
                {`${type.charAt(0).toUpperCase() + type.slice(1)}: ${((count / total) * 100).toFixed(1)}%`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.header}>
        <Balance />
      </View>

      <Text style={styles.title}>Digital Barracks</Text>

      <View style={styles.markSelector}>
        {[1, 2, 3, 4].map((mark) => (
          <TouchableOpacity
            key={mark}
            style={[
              styles.markButton,
              selectedMark === mark && styles.selectedMark
            ]}
            onPress={() => setSelectedMark(mark as MarkLevel)}
          >
            <Text style={styles.markText}>MARK {mark}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Army Size:</Text>
            <Text style={styles.totalCount}>
              {Object.values(botCounts).reduce((a, b) => a + b, 0)}
            </Text>
          </View>
          <ArmyComposition />
        </View>

        <View style={styles.botsContainer}>
          {selectedMark === 1 ? (
            Object.keys(BOT_CATEGORIES).map((type) => (
              <BotCard key={type} type={type as BotType} />
            ))
          ) : (
            <Text style={styles.lockedText}>🔒 MARK {selectedMark} UNITS LOCKED</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  totalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginHorizontal: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  totalLabel: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.body,
    marginRight: SIZING.spacing.sm,
  },
  totalCount: {
    color: '#00FF41',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  markSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 65, 0.2)',
  },
  markButton: {
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
    backgroundColor: 'rgba(26, 77, 51, 0.1)',
    minWidth: 70,
    alignItems: 'center',
  },
  selectedMark: {
    backgroundColor: 'rgba(26, 77, 51, 0.4)',
    borderColor: 'rgba(0, 255, 65, 0.8)',
  },
  markText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  botsContainer: {
    padding: 20,
  },
  botCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4a90e2',
  },
  selectedBotCard: {
    backgroundColor: '#4a90e2',
  },
  botHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  botName: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  botRole: {
    color: '#fff',
    fontSize: 14,
  },
  botDetails: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 10,
  },
  countSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  countLabel: {
    color: '#fff',
    fontSize: 14,
  },
  countValue: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  statItem: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
  },
  statValue: {
    color: '#00ff00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lockedText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  compositionContainer: {
    marginTop: SIZING.spacing.sm,
  },
  barContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: SIZING.spacing.xs,
  },
  compositionBar: {
    height: '100%',
  },
  compositionLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZING.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: SIZING.spacing.xs,
  },
  legendText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
  },
}); 