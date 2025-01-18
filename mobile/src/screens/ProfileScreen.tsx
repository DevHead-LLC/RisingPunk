import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { COLORS, SIZING } from '../styles/theme';

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

  useEffect(() => {
    setProfile({
      username: "Bert Toast",
      level: 1,
      experience: { current: 1000, nextLevel: 1000 },
      armyBonus: { strength: 0, defense: 0, speed: 0, health: 0 }
    });
  }, []);

  if (!profile) return <></>;

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          {/* User Info */}
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{profile.username}</Text>

          {/* Level */}
          <Text style={styles.label}>Level</Text>
          <Text style={styles.value}>{profile.level}</Text>

          {/* Experience */}
          <Text style={styles.label}>Total EXP</Text>
          <Text style={styles.value}>{profile.experience.current}</Text>

          <Text style={styles.label}>EXP to Next Level</Text>
          <Text style={styles.value}>{profile.experience.nextLevel}</Text>

          {/* Army Bonuses */}
          <Text style={styles.sectionTitle}>Army Bonuses</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Strength</Text>
                <Text style={styles.statValue}>+{profile.armyBonus.strength}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Defense</Text>
                <Text style={styles.statValue}>+{profile.armyBonus.defense}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Speed</Text>
                <Text style={styles.statValue}>+{profile.armyBonus.speed}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Health</Text>
                <Text style={styles.statValue}>+{profile.armyBonus.health}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    padding: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a90e2',
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    color: '#2ecc71',
    fontSize: 16,
    marginBottom: 4,
  },
  value: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#2ecc71',
    fontSize: 24,
    marginBottom: 20,
  },
  statsContainer: {
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  statLabel: {
    color: '#2ecc71',
    fontSize: 16,
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
  },
}); 