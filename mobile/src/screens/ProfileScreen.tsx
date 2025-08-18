import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/slices/authSlice';
import { useGetProfileQuery } from '../store/api/authApi';
import { useFetchBotStatsQuery } from '../store/api/botsApi';
import { SIZING, COLORS } from '../styles/theme';
import { Balance } from '../components/common/Balance';

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

interface UserProfile {
  handle: string;
  email: string;
  level: number;
  experience: {
    current: number;
    nextLevel: number;
    total: number;
  };
  unlockedFeatures: {
    hackRig: boolean;
  };
}

export function ProfileScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.auth);
  
  // Use existing working APIs - only when authenticated
  const { data: profileData, isLoading: profileLoading, error: profileError } = useGetProfileQuery(undefined, {
    skip: !token,
  });
  const { data: botStatsData, isLoading: botStatsLoading, error: botStatsError } = useFetchBotStatsQuery(undefined, {
    skip: !token,
  });

  const handleLogout = () => {
    dispatch(logout());
  };

  // Transform API data to match our interface
  const profile: UserProfile | null = profileData ? {
    handle: profileData.handle,
    email: profileData.email,
    level: profileData.level,
    experience: profileData.experience,
    unlockedFeatures: profileData.unlockedFeatures
  } : null;

  const botStats: Record<string, BotStats> = botStatsData?.botStats || {};

  const loading = profileLoading || botStatsLoading;



  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CloseButton onPress={onClose} />
        <Balance />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <CloseButton onPress={onClose} />
        <Balance />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please log in to view profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <CloseButton onPress={onClose} />
        <Balance />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const experiencePercentage = (profile.experience.current / profile.experience.nextLevel) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <Balance />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.usernameContainer}>
            <Text style={styles.username}>{profile.handle}</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <Text style={styles.levelValue}>{profile.level}</Text>
          </View>
        </View>

        {/* Compact Experience Section */}
        <View style={styles.experienceSection}>
          <View style={styles.expRow}>
            <View style={styles.expItem}>
              <Text style={styles.expLabel}>TOTAL XP</Text>
              <Text style={styles.expValue}>{profile.experience.total.toLocaleString()}</Text>
            </View>
            <View style={styles.expItem}>
              <Text style={styles.expLabel}>NEXT LEVEL</Text>
              <Text style={styles.expValue}>{profile.experience.current.toLocaleString()} / {profile.experience.nextLevel.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${experiencePercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(experiencePercentage)}%</Text>
          </View>
        </View>

        {/* Bot Stats Section */}
        <View style={styles.botStatsSection}>
          <Text style={styles.sectionTitle}>BOT STATS</Text>
          <View style={styles.botStatsGrid}>
            {Object.entries(botStats).map(([type, stats]) => (
              <View key={type} style={styles.botStatCard}>
                <View style={styles.botStatHeader}>
                  <Text style={styles.botType}>{type.toUpperCase()}</Text>
                  <Text style={styles.botRole}>{stats.role}</Text>
                </View>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>HP</Text>
                    <Text style={styles.statValue}>{stats.stats.health}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>ATK</Text>
                    <Text style={styles.statValue}>{stats.stats.offense}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>DEF</Text>
                    <Text style={styles.statValue}>{Math.round(stats.stats.defense * 100)}%</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>SPD</Text>
                    <Text style={styles.statValue}>{stats.stats.speed}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>RNG</Text>
                    <Text style={styles.statValue}>{stats.stats.range}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>FEATURES</Text>
          <View style={styles.featureItem}>
            <Text style={styles.featureLabel}>HACK RIG</Text>
            <Text style={[styles.featureValue, { color: profile.unlockedFeatures.hackRig ? COLORS.accent : COLORS.text.secondary }]}>
              {profile.unlockedFeatures.hackRig ? 'UNLOCKED' : 'LOCKED'}
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
    marginTop: SIZING.spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF4B4B',
    fontSize: SIZING.font.body,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.lg,
    paddingHorizontal: SIZING.spacing.sm,
  },
  usernameContainer: {
    flex: 1,
    alignItems: 'center',
  },
  username: {
    color: '#4717F6',
    fontSize: SIZING.font.h1,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  levelBadge: {
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF41',
    borderRadius: 12,
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    alignItems: 'center',
  },
  levelLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: 2,
  },
  levelValue: {
    color: '#00FF41',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  experienceSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.3)',
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
  },
  expRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZING.spacing.sm,
  },
  expItem: {
    alignItems: 'center',
    flex: 1,
  },
  expLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginBottom: 4,
  },
  expValue: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SIZING.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00FF41',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
  },
  botStatsSection: {
    marginBottom: SIZING.spacing.md,
  },
  sectionTitle: {
    color: '#4717F6',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.sm,
  },
  botStatsGrid: {
    gap: SIZING.spacing.sm,
  },
  botStatCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.2)',
    borderRadius: 6,
    padding: SIZING.spacing.sm,
  },
  botStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  botType: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  botRole: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZING.spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: SIZING.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 60,
    justifyContent: 'space-between',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: SIZING.font.small,
    marginRight: 4,
  },
  statValue: {
    color: '#00FF41',
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  featuresSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.2)',
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureLabel: {
    color: '#00FF41',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  featureValue: {
    fontSize: SIZING.font.body,
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
