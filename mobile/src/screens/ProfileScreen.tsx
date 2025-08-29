import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, setShowOnboarding } from '../store/slices/authSlice';
import { updateProfileGender } from '../store/slices/preferencesSlice';
import { useUpdatePreferencesMutation } from '../store/api/preferencesApi';
import { useGetProfileQuery, useGetResearchCenterStatusQuery } from '../store/api/authApi';
import { useFetchBotStatsQuery } from '../store/api/botsApi';
import { SIZING } from '../styles/theme';
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
    researchCenter: boolean;
  };
}

type TabType = 'profile' | 'settings' | 'content';

const createProfileStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: colors.background + '33',
    paddingVertical: SIZING.spacing.md,
    paddingRight: SIZING.spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.text.primary + '1A',
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
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
  },
  leftTabText: {
    color: colors.text.primary + '99',
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
    backgroundColor: colors.error + '1A',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    margin: SIZING.spacing.lg,
    padding: SIZING.spacing.lg,
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
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  levelLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  levelValue: {
    color: colors.matrix,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  experienceSection: {
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.lg,
    marginHorizontal: SIZING.spacing.sm,
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
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  expValue: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background + '4D',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.matrix,
    marginBottom: SIZING.spacing.sm,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.matrix,
    borderRadius: 4,
  },
  progressText: {
    color: colors.matrix,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  botStatsSection: {
    marginBottom: SIZING.spacing.lg,
    marginHorizontal: SIZING.spacing.sm,
  },
  sectionTitle: {
    color: colors.secondary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  botStatsGrid: {
    gap: SIZING.spacing.md,
  },
  botStatCard: {
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
    borderRadius: 8,
    padding: SIZING.spacing.md,
  },
  botStatHeader: {
    alignItems: 'center',
    marginBottom: SIZING.spacing.md,
  },
  botType: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  botRole: {
    color: colors.matrix,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: SIZING.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  statValue: {
    color: colors.matrix,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  featuresSection: {
    marginBottom: SIZING.spacing.lg,
    marginHorizontal: SIZING.spacing.sm,
    backgroundColor: colors.background + '66',
    borderWidth: 1,
    borderColor: colors.matrix + '33',
    borderRadius: 12,
    padding: SIZING.spacing.md,
  },
  featureItem: {
    backgroundColor: colors.matrix + '15',
    borderWidth: 2,
    borderColor: colors.matrix + '66',
    borderRadius: 10,
    padding: SIZING.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
    shadowColor: colors.matrix,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  featureValue: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 1,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.xs,
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.matrix + '40',
  },
  disconnectButton: {
    backgroundColor: colors.background + 'CC',
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    alignItems: 'center',
    marginTop: SIZING.spacing.lg,
    marginHorizontal: SIZING.spacing.md,
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
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
    borderRadius: 8,
    padding: SIZING.spacing.lg,
    marginBottom: SIZING.spacing.md,
  },
  settingLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  themeToggle: {
    alignItems: 'center',
  },
  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.md,
  },
  themeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.matrix + '1A',
    borderWidth: 2,
    borderColor: colors.matrix,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeIconContainerDark: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  themeIcon: {
    fontSize: SIZING.font.large,
  },
  themeToggleText: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: SIZING.spacing.md,
  },
  contentTitle: {
    color: colors.secondary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  introReplaySection: {
    alignItems: 'center',
    gap: SIZING.spacing.sm,
    padding: SIZING.spacing.sm,
  },
  introImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.matrix,
  },
  replayButton: {
    backgroundColor: colors.matrix,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.matrix,
  },
  replayButtonText: {
    color: colors.background,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export function ProfileScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { themeMode, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const profileGender = useAppSelector((state) => state.preferences.profileGender);
  const [updatePreferences] = useUpdatePreferencesMutation();
  
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  
  // Use existing working APIs - only when authenticated
  const { data: profileData, isLoading: profileLoading, error: profileError } = useGetProfileQuery(undefined, {
    skip: !token,
  });
  const { data: botStatsData, isLoading: botStatsLoading, error: botStatsError } = useFetchBotStatsQuery(undefined, {
    skip: !token,
  });
  const { data: researchCenterData, isLoading: researchCenterLoading } = useGetResearchCenterStatusQuery(undefined, {
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
    unlockedFeatures: {
      hackRig: profileData.unlockedFeatures?.hackRig || false,
      researchCenter: researchCenterData?.isUnlocked || false,
    }
  } : null;

  const botStats: Record<string, BotStats> = botStatsData?.botStats || {};

  const loading = profileLoading || botStatsLoading;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CloseButton onPress={onClose} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
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
          
          <TouchableOpacity
            style={[styles.leftTab, activeTab === 'content' && styles.activeLeftTab]}
            onPress={() => setActiveTab('content')}
          >
            <Text style={[styles.leftTabText, activeTab === 'content' && styles.activeLeftTabText]}>
              CONTENT
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
                  <Text style={[
                    styles.featureValue, 
                    { 
                      color: profile.unlockedFeatures.hackRig ? colors.matrix : colors.text.secondary,
                      borderColor: profile.unlockedFeatures.hackRig ? colors.matrix : colors.text.secondary + '66',
                      backgroundColor: profile.unlockedFeatures.hackRig ? colors.matrix + '15' : colors.text.secondary + '15'
                    }
                  ]}>
                    {profile.unlockedFeatures.hackRig ? 'UNLOCKED' : 'LOCKED'}
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureLabel}>RESEARCH CENTER</Text>
                  <Text style={[
                    styles.featureValue, 
                    { 
                      color: profile.unlockedFeatures.researchCenter ? colors.matrix : colors.text.secondary,
                      borderColor: profile.unlockedFeatures.researchCenter ? colors.matrix : colors.text.secondary + '66',
                      backgroundColor: profile.unlockedFeatures.researchCenter ? colors.matrix + '15' : colors.text.secondary + '15'
                    }
                  ]}>
                    {profile.unlockedFeatures.researchCenter ? 'UNLOCKED' : 'LOCKED'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.disconnectButton} onPress={handleLogout}>
                <Text style={styles.disconnectText}>DISCONNECT</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : activeTab === 'settings' ? (
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
                      {themeMode === 'light' ? 'Go Hacker' : 'Go Business'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Gender Toggle Section */}
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>PROFILE AVATAR</Text>
                <TouchableOpacity
                  style={styles.themeToggle}
                  onPress={async () => {
                    const newGender = profileGender === 'male' ? 'female' : 'male';
                    console.log('ProfileScreen: Switching gender to:', newGender);
                    try {
                      const result = await updatePreferences({ profileGender: newGender }).unwrap();
                      console.log('ProfileScreen: Database update result:', result);
                      dispatch(updateProfileGender(newGender));
                      console.log('ProfileScreen: Local state updated to:', newGender);
                    } catch (error) {
                      console.error('ProfileScreen: Failed to update preferences:', error);
                    }
                  }}
                >
                  <View style={styles.themeToggleContent}>
                    <View style={[
                      styles.themeIconContainer,
                      profileGender === 'female' && styles.themeIconContainerDark
                    ]}>
                      <Text style={styles.themeIcon}>
                        {profileGender === 'male' ? '👨' : '👩'}
                      </Text>
                    </View>
                    <Text style={styles.themeToggleText}>
                      {profileGender === 'male' ? 'Switch to Female' : 'Switch to Male'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : activeTab === 'content' ? (
            <View style={styles.contentContainer}>
              <Text style={styles.contentTitle}>CONTENT</Text>
              
              {/* Intro Replay Section */}
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>ONBOARDING</Text>
                <View style={styles.introReplaySection}>
                  <Image 
                    source={require('../assets/images/onboarding/twentythree.png')}
                    style={styles.introImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.replayButton}
                    onPress={() => {
                      onClose();
                      // Trigger onboarding replay by setting showOnboarding to true
                      dispatch(setShowOnboarding(true));
                    }}
                  >
                    <Text style={styles.replayButtonText}>Replay Intro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
