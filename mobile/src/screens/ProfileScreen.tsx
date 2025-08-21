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
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';

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

type TabType = 'profile' | 'settings';

export function ProfileScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { themeMode, toggleTheme } = useTheme();
  const colors = useThemeColors();
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mainLayout: {
      flexDirection: 'row',
      flex: 1,
    },
    leftSidebar: {
      width: SIZING.spacing.md * 8,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      paddingVertical: SIZING.spacing.md,
      paddingRight: SIZING.spacing.sm,
      borderRightWidth: 1,
      borderRightColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 0,
    },
    leftTab: {
      paddingVertical: SIZING.spacing.sm,
      paddingHorizontal: SIZING.spacing.xs,
      alignItems: 'center',
      marginBottom: SIZING.spacing.sm,
      marginLeft: SIZING.spacing.sm,
      borderRadius: 8,
      minHeight: 40,
      justifyContent: 'center',
      width: '80%',
    },
    activeLeftTab: {
      backgroundColor: 'rgba(0, 255, 65, 0.1)',
      borderWidth: 1,
      borderColor: colors.matrix,
    },
    leftTabText: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: SIZING.font.small,
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: SIZING.font.small + 4,
    },
    activeLeftTabText: {
      color: colors.matrix,
      fontWeight: 'bold',
    },
    rightContent: {
      flex: 1,
      padding: SIZING.spacing.md,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      marginTop: SIZING.spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      color: colors.error,
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
      color: colors.secondary,
      fontSize: SIZING.font.h1,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    levelBadge: {
      backgroundColor: 'rgba(0, 255, 65, 0.1)',
      borderWidth: 1,
      borderColor: colors.matrix,
      borderRadius: 12,
      paddingHorizontal: SIZING.spacing.md,
      paddingVertical: SIZING.spacing.sm,
    },
    levelText: {
      color: colors.text.primary,
      fontSize: SIZING.font.small,
      fontWeight: 'bold',
    },
    levelNumber: {
      color: colors.matrix,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
    },
    levelLabel: {
      color: colors.text.primary,
      fontSize: SIZING.font.small,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    levelValue: {
      color: colors.matrix,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    experienceSection: {
      borderWidth: 1,
      borderColor: colors.matrix,
      borderRadius: 8,
      padding: SIZING.spacing.md,
      marginBottom: SIZING.spacing.lg,
    },
    expRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SIZING.spacing.md,
    },
    expItem: {
      alignItems: 'center',
      flex: 1,
    },
    expLabel: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      marginBottom: SIZING.spacing.xs,
    },
    expValue: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    progressContainer: {
      alignItems: 'center',
    },
    progressBar: {
      height: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 4,
      marginBottom: SIZING.spacing.sm,
      width: '100%',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.matrix,
      borderRadius: 4,
    },
    progressText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      textAlign: 'center',
    },
    nextLevelText: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    botStatsSection: {
      marginBottom: SIZING.spacing.lg,
    },
    sectionTitle: {
      color: colors.secondary,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      marginBottom: SIZING.spacing.md,
    },
    botStatsGrid: {
      gap: SIZING.spacing.sm,
    },
    botStatCard: {
      borderWidth: 1,
      borderColor: colors.matrix,
      borderRadius: 8,
      padding: SIZING.spacing.md,
      marginBottom: SIZING.spacing.sm,
    },
    botStatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SIZING.spacing.sm,
    },
    botType: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    botRole: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      fontStyle: 'italic',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SIZING.spacing.xs,
    },
    statItem: {
      alignItems: 'center',
      minWidth: 50,
    },
    statLabel: {
      color: colors.text.primary,
      fontSize: SIZING.font.small,
      marginBottom: 2,
    },
    statValue: {
      color: colors.matrix,
      fontSize: SIZING.font.small,
      fontWeight: 'bold',
    },
    featuresSection: {
      marginBottom: SIZING.spacing.lg,
    },
    featureItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.matrix,
      borderRadius: 8,
      padding: SIZING.spacing.md,
    },
    featureLabel: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    featureValue: {
      fontSize: SIZING.font.small,
      fontWeight: 'bold',
    },
    disconnectButton: {
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 8,
      padding: SIZING.spacing.md,
      alignItems: 'center',
      marginTop: SIZING.spacing.lg,
    },
    disconnectText: {
      color: colors.error,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    settingsContainer: {
      flex: 1,
      padding: SIZING.spacing.md,
    },
    settingsTitle: {
      color: colors.text.primary,
      fontSize: SIZING.font.h2,
      fontWeight: 'bold',
      marginBottom: SIZING.spacing.lg,
      textAlign: 'center',
    },
    settingCard: {
      borderWidth: 1,
      borderColor: colors.matrix,
      borderRadius: 8,
      padding: SIZING.spacing.md,
      marginBottom: SIZING.spacing.md,
    },
    settingLabel: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
      marginBottom: SIZING.spacing.md,
    },
    themeToggle: {
      borderWidth: 1,
      borderColor: colors.matrix,
      borderRadius: 8,
      padding: SIZING.spacing.md,
    },
    themeToggleContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    themeIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeIcon: {
      fontSize: SIZING.font.h2,
    },
    themeToggleText: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
    },
    themeIconContainerDark: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderWidth: 2,
      borderColor: '#000000',
    },
  });
  
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
      
      <View style={styles.mainLayout}>
        {/* LEFT SIDE TABS - AS REQUESTED */}
        <View style={styles.leftSidebar}>
          <TouchableOpacity
            style={[styles.leftTab, activeTab === 'profile' && styles.activeLeftTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.leftTabText, activeTab === 'profile' && styles.activeLeftTabText]}>
              PROFILE
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.leftTab, activeTab === 'settings' && styles.activeLeftTab]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.leftTabText, activeTab === 'settings' && styles.activeLeftTabText]}>
              SETTINGS
            </Text>
          </TouchableOpacity>
        </View>

        {/* RIGHT SIDE CONTENT */}
        <View style={styles.rightContent}>
          {activeTab === 'profile' ? (
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
          ) : (
            <View style={styles.settingsContainer}>
              <Text style={styles.settingsTitle}>SETTINGS</Text>
              
              {/* Theme Toggle Section */}
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>APPEARANCE</Text>
                <TouchableOpacity
                  style={styles.themeToggle}
                  onPress={toggleTheme}
                >
                  <View style={styles.themeToggleContent}>
                    <View style={[
                      styles.themeIconContainer,
                      themeMode === 'light' && styles.themeIconContainerDark
                    ]}>
                      <Text style={styles.themeIcon}>
                        {themeMode === 'light' ? '👀' : '💡'}
                      </Text>
                    </View>
                    <Text style={styles.themeToggleText}>
                      {themeMode === 'light' ? 'Go Dark' : 'Go Light'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
