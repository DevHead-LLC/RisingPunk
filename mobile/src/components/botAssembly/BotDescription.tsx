import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SIZING, COLORS } from '../../styles/theme';
import { BotType } from '../../types/bots';

interface BotStats {
  role: string;
  stats: {
    health: number;
    offense: number;
    defense: number;
    speed: number;
    range: number;
  };
}

type BotDescriptionProps = {
  type: BotType;
  userLevel: number;
};

const getBotDescription = (type: BotType) => ({
  breacher: 'Fast-moving assault units, specialized in penetrating network defenses',
  guardian: 'Heavy defensive units, forming the backbone of your digital army',
  phreak: 'Long-range disruption specialists, attacking from network shadows',
})[type];

export const BotDescription = React.memo(function BotDescription({ type, userLevel }: BotDescriptionProps) {
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBotStats = async () => {
      try {
        // For now, use mock data until we implement proper API integration
        // TODO: Replace with actual API call to /api/bots/stats
        const mockStats: BotStats = {
          role: type === 'breacher' ? 'Infantry' : type === 'guardian' ? 'Cavalry' : 'Ranged',
          stats: {
            health: type === 'breacher' ? 18 : type === 'guardian' ? 14 : 12,
            offense: type === 'breacher' ? 7 : type === 'guardian' ? 8 : 6,
            defense: type === 'breacher' ? 8 : type === 'guardian' ? 6 : 5,
            speed: type === 'breacher' ? 5 : type === 'guardian' ? 9 : 7,
            range: type === 'breacher' ? 5 : type === 'guardian' ? 4 : 9,
          }
        };
        
        // Apply level scaling (simplified version of server formulas)
        const levelMultiplier = 1 + (0.05 * (userLevel - 1));
        const scaledStats = {
          ...mockStats,
          stats: {
            health: Math.round(mockStats.stats.health * levelMultiplier * 100) / 100,
            offense: Math.round(mockStats.stats.offense * levelMultiplier * 100) / 100,
            defense: Math.min(mockStats.stats.defense + Math.floor((userLevel - 1) / 2), 30),
            speed: Math.min(mockStats.stats.speed + Math.floor((userLevel - 1) / 5), mockStats.stats.speed + 3),
            range: mockStats.stats.range,
          }
        };
        
        setBotStats(scaledStats);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching bot stats:', error);
        setLoading(false);
      }
    };

    fetchBotStats();
  }, [type, userLevel]);

  if (loading) {
    return <Text style={styles.botDescription}>Loading stats...</Text>;
  }

  if (!botStats) {
    return <Text style={styles.botDescription}>{getBotDescription(type)}</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.botDescription}>{getBotDescription(type)}</Text>
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Level {userLevel} Stats:</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Health</Text>
            <Text style={styles.statValue}>{botStats.stats.health}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Offense</Text>
            <Text style={styles.statValue}>{botStats.stats.offense}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Defense</Text>
            <Text style={styles.statValue}>{botStats.stats.defense}%</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Speed</Text>
            <Text style={styles.statValue}>{botStats.stats.speed}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Range</Text>
            <Text style={styles.statValue}>{botStats.stats.range}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZING.spacing.md,
  },
  botDescription: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: SIZING.spacing.sm,
    borderRadius: 4,
  },
  statsTitle: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZING.spacing.xs,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: SIZING.font.small,
  },
  statValue: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
});
