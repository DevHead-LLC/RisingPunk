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
import { useAppSelector } from '../store/hooks';
import { SIZING } from '../styles/theme';
import { COLORS } from '../styles/theme';

type MarkLevel = 1 | 2 | 3 | 4;
type BotType = 'breacher' | 'guardian' | 'phreak';

export const BOT_CATEGORIES = {
  guardian: { // Cavalry
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 8,
      defense: 6
    },
    advantage: 'Strong vs. Infantry, Weak vs. Ranged'
  },
  breacher: { // Infantry
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 7,
      defense: 8
    },
    advantage: 'Strong vs. Ranged, Weak vs. Cavalry'
  },
  phreak: { // Ranged
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 6,
      defense: 5
    },
    advantage: 'Strong vs. Cavalry, Weak vs. Infantry'
  }
};

// Enemy bot categories with much higher attack stats
export const ENEMY_BOT_CATEGORIES = {
  guardian: { // Cavalry
    role: 'Cavalry',
    stats: {
      health: 14,
      speed: 9,
      range: 4,
      offense: 32, // 4x higher attack
      defense: 6
    },
    advantage: 'Strong vs. Infantry, Weak vs. Ranged'
  },
  breacher: { // Infantry
    role: 'Infantry',
    stats: {
      health: 18,
      speed: 5,
      range: 5,
      offense: 28, // 4x higher attack
      defense: 8
    },
    advantage: 'Strong vs. Ranged, Weak vs. Cavalry'
  },
  phreak: { // Ranged
    role: 'Ranged',
    stats: {
      health: 12,
      speed: 7,
      range: 9,
      offense: 24, // 4x higher attack
      defense: 5
    },
    advantage: 'Strong vs. Cavalry, Weak vs. Infantry'
  }
};

export function DigitalBarracksScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const botCounts = useAppSelector((state) => state.bots.botCounts);
  const [selectedMark, setSelectedMark] = useState<MarkLevel>(1);

  const BotCard = ({ type }: { type: BotType }) => {
    const hackerLore = {
      breacher: "IRL: Named after 'breach and clear' tactics used in early penetration testing, where security teams would methodically break through firewall layers.",
      guardian: "IRL: Inspired by 'packet guardian' programs from the 1990s that network administrators used to monitor and filter suspicious traffic.",
      phreak: "IRL: Based on 'phone phreakers' from the 1970s who used blue boxes to manipulate telephone systems and make free long-distance calls."
    };

    return (
      <View style={styles.botCard}>
        <View style={styles.botHeader}>
          <Text style={styles.botName}>{type.toUpperCase()}</Text>
          <Text style={styles.botRole}>{BOT_CATEGORIES[type].role}</Text>
        </View>
        
        <View style={styles.botContent}>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>Available:</Text>
            <Text style={styles.countValue}>{botCounts[type]}</Text>
            <View style={styles.deployedContainer}>
              <Text style={styles.countLabel}>Deployed: 0</Text>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.loreContainer}>
              <Text style={styles.hackerLore}>{hackerLore[type]}</Text>
              <Text style={styles.advantageText}>{BOT_CATEGORIES[type].advantage}</Text>
            </View>

            <View style={styles.statsContainer}>
              {Object.entries(BOT_CATEGORIES[type].stats).map(([stat, value]) => (
                <View key={stat} style={styles.statRow}>
                  <Text style={styles.statLabel}>
                    {stat === 'range' ? 'ATTACK DISTANCE' :
                     stat === 'offense' ? 'ATTACK POWER' :
                     stat === 'defense' ? 'DEFENSE ABILITY' :
                     stat.toUpperCase()}
                  </Text>
                  <Text style={styles.statValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    );
  };

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
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
  },
  botHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  botName: {
    color: '#2196F3',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  botRole: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.body,
  },
  botContent: {
    gap: SIZING.spacing.xs,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 65, 0.2)',
    paddingBottom: SIZING.spacing.xs,
  },
  countLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.body,
    marginRight: SIZING.spacing.sm,
  },
  countValue: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginRight: SIZING.spacing.lg,
  },
  deployedContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
  },
  loreContainer: {
    flex: 3,
    justifyContent: 'center',
  },
  hackerLore: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: '#4717F6',
    paddingLeft: SIZING.spacing.xs,
    marginBottom: SIZING.spacing.lg,
  },
  statsContainer: {
    flex: 2,
    gap: SIZING.spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    flex: 1,
  },
  statValue: {
    color: '#9C27B0',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginLeft: SIZING.spacing.sm,
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
  advantageText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
    paddingLeft: SIZING.spacing.xs,
  },
}); 