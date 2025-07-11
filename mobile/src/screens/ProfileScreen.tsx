import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { SIZING } from '../styles/theme';
import { Balance } from '../components/common/Balance';

interface UserProfile {
  username: string;
  level: number;
  experience: {
    current: number;
    nextLevel: number;
  };
  armyBonus: {
    strength: number;
    defense: number;
    speed: number;
    health: number;
  };
}

export function ProfileScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  useEffect(() => {
    setProfile({
      username: 'Bert Toast',
      level: 1,
      experience: { current: 0, nextLevel: 1000 },
      armyBonus: { strength: 0, defense: 0, speed: 0, health: 0 },
    });
  }, []);

  if (!profile) {return <></>;}

  const experiencePercentage = (profile.experience.current / profile.experience.nextLevel) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <Balance />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.username}>{profile.username}</Text>
          <View style={styles.levelContainer}>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <Text style={styles.levelValue}>{profile.level}</Text>
          </View>
        </View>

        <View style={styles.experienceCard}>
          <Text style={styles.sectionTitle}>EXPERIENCE</Text>
          <View style={styles.experienceDetails}>
            <View style={styles.expCurrentContainer}>
              <Text style={styles.expLabel}>TOTAL XP</Text>
              <Text style={styles.expValue}>0</Text>
            </View>
            <View style={styles.expProgressContainer}>
              <Text style={styles.expLabel}>NEXT LEVEL</Text>
              <Text style={styles.expProgress}>0 / 1000</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${experiencePercentage}%` }]} />
          </View>
        </View>

        <View style={styles.bonusCard}>
          <Text style={styles.sectionTitle}>ARMY BONUSES</Text>
          <View style={styles.bonusGrid}>
            {Object.entries(profile.armyBonus).map(([stat, value]) => (
              <View key={stat} style={styles.bonusItem}>
                <Text style={styles.bonusLabel}>{stat.toUpperCase()}</Text>
                <Text style={styles.bonusValue}>+{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.disconnectButton} onPress={handleLogout}>
          <Text style={styles.disconnectText}>DISCONNECT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
    padding: SIZING.spacing.md,
  },
  header: {
    alignItems: 'center',
    marginVertical: SIZING.spacing.lg,
  },
  username: {
    color: '#4717F6',
    fontSize: SIZING.font.h1,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  levelContainer: {
    alignItems: 'center',
  },
  levelLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
  },
  levelValue: {
    color: '#00FF41',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  experienceCard: {
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
  },
  experienceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZING.spacing.md,
    marginTop: SIZING.spacing.sm,
  },
  expCurrentContainer: {
    alignItems: 'center',
  },
  expProgressContainer: {
    alignItems: 'center',
  },
  expLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs,
  },
  expValue: {
    color: '#00FF41',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  expProgress: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FF41',
  },
  bonusCard: {
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
  },
  sectionTitle: {
    color: '#4717F6',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  bonusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZING.spacing.sm,
  },
  bonusItem: {
    width: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
    padding: SIZING.spacing.md,
    alignItems: 'center',
  },
  bonusLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.xs,
  },
  bonusValue: {
    color: '#9C27B0',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: 4,
    padding: SIZING.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 75, 75, 0.4)',
  },
  disconnectText: {
    color: '#FF4B4B',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
});
