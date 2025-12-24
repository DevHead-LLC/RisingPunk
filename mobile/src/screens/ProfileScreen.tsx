import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout, setShowOnboarding, updateUserHandle, forceRefresh, setShowEmailVerification, refreshUserData } from '../store/slices/authSlice';
import { updateProfileGender } from '../store/slices/preferencesSlice';
import { useUpdatePreferencesMutation } from '../store/api/preferencesApi';
import { useGetCurrentTaskGuideTaskQuery, useUpdateTaskGuideVisibilityMutation, useTrackProfileVisitMutation, useTrackThemeChangeMutation } from '../store/api/userGuideApi';
import { useTaskGuideHighlight } from '../contexts/TaskGuideHighlightContext';
import { TaskGuideHighlightOverlay } from '../components/turf/TaskGuideHighlightOverlay';
import { useGetProfileQuery, useGetResearchCenterStatusQuery, useDeleteAccountMutation, authApi } from '../store/api/authApi';
import { useFetchBotStatsQuery, botsApi } from '../store/api/botsApi';
import { balanceApi } from '../store/api/balanceApi';
import { mapApi } from '../store/api/mapApi';
import { SIZING } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { useResponsiveDimensions } from '../hooks/useResponsiveDimensions';
import { PrivacyPolicyModal } from '../components/profile/PrivacyPolicyModal';
import { TermsOfServiceModal } from '../components/profile/TermsOfServiceModal';
import { DeleteAccountModal } from '../components/profile/DeleteAccountModal';
import { HandleSelectionModal } from '../components/modals/HandleSelectionModal';

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
  emailVerified: boolean;
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
  battleStats?: {
    botsDestroyed: number;
    botsLost: number;
    successfulAttacks: number;
    failedAttacks: number;
    successfulDefenses: number;
    failedDefenses: number;
  };
}

type TabType = 'profile' | 'settings' | 'account' | 'content';

const createProfileStyles = (colors: any, screenWidth: number, scaleFactor: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainLayout: {
    flexDirection: 'row',
    flex: 1,
  },
  leftSidebar: {
    width: SIZING.spacing.md * 11,
    backgroundColor: colors.background + '33',
    paddingVertical: SIZING.spacing.md,
    borderRightWidth: 1,
    borderRightColor: colors.text.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
  },
  leftTabContainer: {
    marginBottom: SIZING.spacing.sm,
    borderRadius: 4,
  },
  leftTab: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.xs,
    alignItems: 'center',
    marginLeft: SIZING.spacing.sm,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    width: '70%', // Increased from 80% to 90% for wider tabs
  },
  activeLeftTab: {
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
  },
  leftTabText: {
    color: colors.text.primary + '99',
    fontSize: Math.max(SIZING.font.small * 0.95, 12), // Slightly smaller text, minimum 12px
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: Math.max(SIZING.font.small * 0.95, 12) + 2, // Adjusted line height
  },
  activeLeftTabText: {
    color: colors.matrix,
    fontWeight: 'bold',
  },
  rightContent: {
    flex: 1,
    padding: SIZING.spacing.md,
    maxWidth: screenWidth * 0.7, // Ensure right content doesn't exceed 75% of screen width
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' ? 25 : 20,
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
  battleStatsSection: {
    marginBottom: SIZING.spacing.lg,
    marginHorizontal: SIZING.spacing.sm,
  },
  battleStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.md,
  },
  battleStatCard: {
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
    maxWidth: '48%',
  },
  battleStatLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  battleStatValue: {
    color: colors.matrix,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  winPercentageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: SIZING.spacing.md,
    marginTop: SIZING.spacing.sm,
  },
  winPercentageItem: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.matrix,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    alignItems: 'center',
    flex: 1,
  },
  winPercentageLabel: {
    color: colors.text.secondary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  winPercentageValue: {
    color: colors.matrix,
    fontSize: SIZING.font.h3,
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
  primaryButton: {
    backgroundColor: colors.background + 'CC',
    borderWidth: 2,
    borderColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    alignItems: 'center',
    marginTop: SIZING.spacing.lg,
    marginHorizontal: SIZING.spacing.md,
  },
  primaryButtonText: {
    color: colors.secondary,
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
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
  },
  settingLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  themeToggleContainer: {
    alignItems: 'center',
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
    gap: SIZING.spacing.xs,
    padding: SIZING.spacing.xs,
  },
  introImage: {
    width: 200,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.matrix,
  },
  replayButton: {
    backgroundColor: colors.matrix,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
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
  privacyPolicyButton: {
    backgroundColor: colors.matrix + '1A',
    borderWidth: 1,
    borderColor: colors.matrix,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    alignItems: 'center',
    marginTop: SIZING.spacing.sm,
  },
  privacyPolicyButtonText: {
    color: colors.matrix,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  emailVerificationContainer: {
    marginTop: SIZING.spacing.sm,
  },
  verificationStatus: {
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  verificationLabel: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm,
  },
  warningText: {
    fontSize: SIZING.font.small,
    lineHeight: 16,
    textAlign: 'center',
  },
});

export function ProfileScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showChangeHandle, setShowChangeHandle] = useState(false);
  const { themeMode, toggleTheme } = useTheme();
  const colors = useThemeColors();
  const profileGender = useAppSelector((state) => state.preferences.profileGender);
  const { width: screenWidth, scaleFactor } = useResponsiveDimensions();

  const [updatePreferences] = useUpdatePreferencesMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const { data: taskGuideData } = useGetCurrentTaskGuideTaskQuery();
  const [updateTaskGuideVisibility] = useUpdateTaskGuideVisibilityMutation();
  const [trackProfileVisit] = useTrackProfileVisitMutation();
  const [trackThemeChange] = useTrackThemeChangeMutation();
  const { highlightTaskId, highlightStep, clearHighlight, advanceHighlightStep } = useTaskGuideHighlight();
  
  const isThemeTask = highlightTaskId === 'use-hacker-mode' || highlightTaskId === 'use-business-mode';
  const isSettingsHighlighted = isThemeTask && highlightStep === 'settings-tab';
  const isThemeToggleHighlighted = isThemeTask && highlightStep === 'theme-toggle';
  
  const [settingsColorIndex, setSettingsColorIndex] = useState(0);
  const [themeToggleColorIndex, setThemeToggleColorIndex] = useState(0);
  const settingsAnimatedBorderColor = useState(new Animated.Value(0))[0];
  const themeToggleAnimatedBorderColor = useState(new Animated.Value(0))[0];
  const highlightColors = [colors.primary, colors.secondary, colors.matrix];
  
  useEffect(() => {
    if (isSettingsHighlighted) {
      const interval = setInterval(() => {
        setSettingsColorIndex(prev => (prev + 1) % highlightColors.length);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSettingsHighlighted, highlightColors.length]);
  
  useEffect(() => {
    if (isSettingsHighlighted) {
      Animated.timing(settingsAnimatedBorderColor, {
        toValue: settingsColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [settingsColorIndex, isSettingsHighlighted, settingsAnimatedBorderColor]);
  
  useEffect(() => {
    if (isThemeToggleHighlighted) {
      const interval = setInterval(() => {
        setThemeToggleColorIndex(prev => (prev + 1) % highlightColors.length);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isThemeToggleHighlighted, highlightColors.length]);
  
  useEffect(() => {
    if (isThemeToggleHighlighted) {
      Animated.timing(themeToggleAnimatedBorderColor, {
        toValue: themeToggleColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [themeToggleColorIndex, isThemeToggleHighlighted, themeToggleAnimatedBorderColor]);
  
  const settingsAnimatedBorderColorValue = settingsAnimatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: highlightColors,
  });
  
  const themeToggleAnimatedBorderColorValue = themeToggleAnimatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: highlightColors,
  });
  
  const handleSettingsTabPress = useCallback(() => {
    setActiveTab('settings');
    if (isThemeTask && highlightStep === 'settings-tab') {
      advanceHighlightStep();
    }
  }, [isThemeTask, highlightStep, advanceHighlightStep]);
  
  const handleThemeToggle = useCallback(async () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark';
    toggleTheme();
    
    if (isThemeTask) {
      try {
        await trackThemeChange({ theme: newTheme }).unwrap();
        clearHighlight();
      } catch (error) {
        console.error('Error tracking theme change:', error);
        clearHighlight();
      }
    } else {
      trackThemeChange({ theme: newTheme }).catch(() => {});
    }
  }, [themeMode, toggleTheme, isThemeTask, trackThemeChange, clearHighlight]);

  
  const styles = useMemo(() => createProfileStyles(colors, screenWidth, scaleFactor), [colors, screenWidth, scaleFactor]);
  
  // Use existing working APIs - only when authenticated
  const { data: profileData, isLoading: profileLoading, error: profileError, refetch } = useGetProfileQuery(undefined, {
    skip: !token,
  });

  const { data: botStatsData, isLoading: botStatsLoading, error: botStatsError } = useFetchBotStatsQuery(undefined, {
    skip: !token,
  });
  const { data: researchCenterData, isLoading: researchCenterLoading } = useGetResearchCenterStatusQuery(undefined, {
    skip: !token,
  });

  useEffect(() => {
    if (token) {
      // Track profile visit (forward compatible - only tracks new visits)
      // This will also auto-complete the view-profile task if conditions are met
      trackProfileVisit().then(() => {
        // Clear highlight mode after tracking visit
        if (highlightTaskId === 'view-profile') {
          clearHighlight();
        }
      }).catch(() => {
        // Silently fail if tracking fails
        if (highlightTaskId === 'view-profile') {
          clearHighlight();
        }
      });
    }
  }, [token, highlightTaskId, trackProfileVisit, clearHighlight]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleDeleteAccount = async (handle: string) => {
    try {
      await deleteAccount({ handle }).unwrap();
      
      // Clear all API caches before logout to prevent pending requests from failing
      dispatch(authApi.util.resetApiState());
      dispatch(balanceApi.util.resetApiState());
      dispatch(botsApi.util.resetApiState());
      dispatch(mapApi.util.resetApiState());
      
      dispatch(logout());
    } catch (error) {
      console.error('ProfileScreen: Failed to delete account:', error);
      throw error;
    }
  };

  const handleUpdateUserHandle = async (newHandle: string) => {
    try {
      await dispatch(updateUserHandle(newHandle)).unwrap();
      setShowChangeHandle(false);
    } catch (error) {
      console.error('ProfileScreen: Failed to update handle:', error);
      throw error;
    }
  };

  // Transform API data to match our interface
  const profile: UserProfile | null = profileData ? {
    handle: profileData.handle,
    email: profileData.email,
    emailVerified: profileData.emailVerified || false,
    level: profileData.level,
    experience: profileData.experience,
    unlockedFeatures: {
      hackRig: profileData.unlockedFeatures?.hackRig || false,
      researchCenter: researchCenterData?.isUnlocked || false,
    },
    battleStats: profileData.battleStats
  } : null;

  const calculateWinPercentage = (successful: number, failed: number): string => {
    const total = successful + failed;
    if (total === 0) return 'N/A';
    return `${Math.round((successful / total) * 100)}%`;
  };

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
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingBottom: 20 }]}>
      <CloseButton onPress={onClose} />
      {isThemeTask && (
        <TaskGuideHighlightOverlay 
          forSettings={highlightStep === 'settings-tab'} 
          forThemeToggle={highlightStep === 'theme-toggle'} 
        />
      )}
      
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
          
          <Animated.View
            style={[
              styles.leftTabContainer,
              isSettingsHighlighted && {
                borderColor: settingsAnimatedBorderColorValue,
                borderWidth: 3,
                zIndex: 1000,
              }
            ]}
          >
            <TouchableOpacity
              style={[styles.leftTab, activeTab === 'settings' && styles.activeLeftTab]}
              onPress={handleSettingsTabPress}
            >
              <Text style={[styles.leftTabText, activeTab === 'settings' && styles.activeLeftTabText]}>
                SETTINGS
              </Text>
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity
            style={[styles.leftTab, activeTab === 'account' && styles.activeLeftTab]}
            onPress={() => setActiveTab('account')}
          >
            <Text style={[styles.leftTabText, activeTab === 'account' && styles.activeLeftTabText]}>
              ACCOUNT
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
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
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

              {/* Battle Stats Section */}
              {profile?.battleStats && (
                <View style={styles.battleStatsSection}>
                  <Text style={styles.sectionTitle}>BATTLE STATISTICS</Text>
                  <View style={styles.battleStatsGrid}>
                    <View style={styles.battleStatCard}>
                      <Text style={styles.battleStatLabel}>Bots Destroyed</Text>
                      <Text style={styles.battleStatValue}>{profile.battleStats.botsDestroyed}</Text>
                    </View>
                    <View style={styles.battleStatCard}>
                      <Text style={styles.battleStatLabel}>Bots Lost</Text>
                      <Text style={styles.battleStatValue}>{profile.battleStats.botsLost}</Text>
                    </View>
                    <View style={styles.battleStatCard}>
                      <Text style={styles.battleStatLabel}>Successful Attacks</Text>
                      <Text style={styles.battleStatValue}>{profile.battleStats.successfulAttacks}</Text>
                    </View>
                    <View style={styles.battleStatCard}>
                      <Text style={styles.battleStatLabel}>Failed Attacks</Text>
                      <Text style={styles.battleStatValue}>{profile.battleStats.failedAttacks}</Text>
                    </View>
                    <View style={styles.battleStatCard}>
                      <Text style={styles.battleStatLabel}>Successful Defenses</Text>
                      <Text style={styles.battleStatValue}>{profile.battleStats.successfulDefenses}</Text>
                    </View>
                    <View style={styles.battleStatCard}>
                      <Text style={styles.battleStatLabel}>Failed Defenses</Text>
                      <Text style={styles.battleStatValue}>{profile.battleStats.failedDefenses}</Text>
                    </View>
                  </View>
                  <View style={styles.winPercentageContainer}>
                    <View style={styles.winPercentageItem}>
                      <Text style={styles.winPercentageLabel}>Attack Win %</Text>
                      <Text style={styles.winPercentageValue}>
                        {calculateWinPercentage(profile.battleStats.successfulAttacks, profile.battleStats.failedAttacks)}
                      </Text>
                    </View>
                    <View style={styles.winPercentageItem}>
                      <Text style={styles.winPercentageLabel}>Defense Win %</Text>
                      <Text style={styles.winPercentageValue}>
                        {calculateWinPercentage(profile.battleStats.successfulDefenses, profile.battleStats.failedDefenses)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

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
                <Animated.View
                  style={[
                    styles.themeToggleContainer,
                    isThemeToggleHighlighted && {
                      borderColor: themeToggleAnimatedBorderColorValue,
                      borderWidth: 3,
                      borderRadius: 8,
                      zIndex: 1000,
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.themeToggle}
                    onPress={handleThemeToggle}
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
                </Animated.View>
              </View>

              {/* Gender Toggle Section */}
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>PROFILE AVATAR</Text>
                <TouchableOpacity
                  style={styles.themeToggle}
                  onPress={async () => {
                    const newGender = profileGender === 'male' ? 'female' : 'male';
                    
                    try {
                      const result = await updatePreferences({ profileGender: newGender }).unwrap();
                      dispatch(updateProfileGender(newGender));
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

              {/* Task Guide Toggle Section */}
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>TASK GUIDE</Text>
                <TouchableOpacity
                  style={styles.themeToggle}
                  onPress={async () => {
                    const newShowTaskGuide = !(taskGuideData?.showTaskGuide ?? true);
                    
                    try {
                      await updateTaskGuideVisibility({ showTaskGuide: newShowTaskGuide }).unwrap();
                    } catch (error) {
                      console.error('ProfileScreen: Failed to update task guide visibility:', error);
                    }
                  }}
                >
                  <View style={styles.themeToggleContent}>
                    <View style={[
                      styles.themeIconContainer,
                      !(taskGuideData?.showTaskGuide ?? true) && styles.themeIconContainerDark
                    ]}>
                      <Text style={styles.themeIcon}>
                        {(taskGuideData?.showTaskGuide ?? true) ? '📋' : '🚫'}
                      </Text>
                    </View>
                    <Text style={styles.themeToggleText}>
                      {(taskGuideData?.showTaskGuide ?? true) ? 'Hide Task Guide' : 'Show Task Guide'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : activeTab === 'account' ? (
            <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
              <Text style={styles.settingsTitle}>ACCOUNT SETTINGS</Text>
              
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>UPDATE ACCOUNT SETTINGS</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: SIZING.spacing.md }]}
                  onPress={() => setShowChangeHandle(true)}
                >
                  <Text style={styles.primaryButtonText}>CHANGE USER HANDLE</Text>
                </TouchableOpacity>
                
                {/* Email Verification Status */}
                <View style={[styles.settingCard, { marginTop: SIZING.spacing.md }]}>
                  <Text style={styles.settingLabel}>EMAIL VERIFICATION</Text>
                  <View style={styles.emailVerificationContainer}>
                    <View style={styles.verificationStatus}>
                      <Text style={[
                        styles.verificationLabel, 
                        { color: user?.emailVerified ? colors.matrix : colors.error }
                      ]}>
                        {user?.emailVerified ? '✓ VERIFIED' : '⚠ UNVERIFIED'}
                      </Text>
                    </View>
                  </View>
                  
                  {!user?.emailVerified && (
                    <View style={styles.warningContainer}>
                      <Text style={[styles.warningText, { color: colors.error }]}>
                        ⚠️ Your email is not verified. Without verification, you may not be able to recover your account if you forget your password.
                      </Text>
                      <TouchableOpacity
                        style={[styles.primaryButton, { marginTop: SIZING.spacing.sm }]}
                        onPress={() => dispatch(setShowEmailVerification(true))}
                      >
                        <Text style={styles.primaryButtonText}>VERIFY EMAIL</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                {user?.debugFeatures?.enableDataRefresh && (
                  <TouchableOpacity
                    style={[styles.primaryButton, { marginTop: SIZING.spacing.md }]}
                    onPress={() => {
                      // Show confirmation dialog for safety
                      Alert.alert(
                        'Data Refresh',
                        'This will refresh all your data from the server. Only use this if you\'re experiencing sync issues.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Refresh', onPress: () => dispatch(forceRefresh()) }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.primaryButtonText}>REFRESH DATA</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>DANGER ZONE</Text>
                <TouchableOpacity
                  style={[styles.disconnectButton, { marginTop: SIZING.spacing.md }]}
                  onPress={() => setShowDeleteAccount(true)}
                >
                  <Text style={styles.disconnectText}>DELETE ACCOUNT</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : activeTab === 'content' ? (
            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContentContainer}>
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

              {/* Privacy Policy Section */}
              <View style={styles.settingCard}>
                <Text style={styles.settingLabel}>APPLICATION DETAILS</Text>
                <TouchableOpacity
                  style={styles.privacyPolicyButton}
                  onPress={() => setShowPrivacyPolicy(true)}
                >
                  <Text style={styles.privacyPolicyButtonText}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.privacyPolicyButton}
                  onPress={() => setShowTermsOfService(true)}
                >
                  <Text style={styles.privacyPolicyButtonText}>Terms of Service</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>

      <PrivacyPolicyModal
        visible={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />
      <TermsOfServiceModal
        visible={showTermsOfService}
        onClose={() => setShowTermsOfService(false)}
      />
      <DeleteAccountModal
        visible={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onDelete={handleDeleteAccount}
        userHandle={profile.handle}
      />
      <HandleSelectionModal
        visible={showChangeHandle}
        onSubmit={handleUpdateUserHandle}
        isLoading={false}
        isRequired={false}
        onClose={() => setShowChangeHandle(false)}
      />
    </SafeAreaView>
  );
}
