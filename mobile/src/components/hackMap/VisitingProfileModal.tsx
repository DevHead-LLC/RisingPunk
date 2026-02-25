import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Image, ScrollView, Platform, Pressable, Dimensions } from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../context/ThemeContext';
import { SIZING } from '../../styles/theme';
import { useGetUserProfileQuery } from '../../store/api/authApi';
import { useAppSelector } from '../../store/hooks';
import { useTrackAnotherUserProfileVisitMutation } from '../../store/api/userGuideApi';

interface VisitingProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  /** Called when profile returns 404 (e.g. deleted account). Use to clear that user from map/UI. */
  onUserNotFound?: (userId: string) => void;
  /** When provided, shows a "Message" button that opens private messages to this user. Call with (userId, handle) then close. */
  onOpenMessages?: (userId: string, username: string) => void;
  /** When provided, shows a "Block user" button. Call with userId. Caller should close the modal (e.g. handleVisitingProfileClose) to avoid double-close. */
  onBlockUser?: (userId: string) => void;
}

export const VisitingProfileModal: React.FC<VisitingProfileModalProps> = ({
  visible,
  onClose,
  userId,
  onUserNotFound,
  onOpenMessages,
  onBlockUser,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: userProfile, isLoading, error, refetch } = useGetUserProfileQuery(userId, {
    skip: !visible || !userId,
  });
  const [trackAnotherUserProfileVisit] = useTrackAnotherUserProfileVisitMutation();
  const trackedUserIdRef = useRef<string | null>(null);
  const styles = createStyles(colors, themeMode);

  // Dev-only: log profile load failures for investigation (status, data, userId)
  useEffect(() => {
    if (__DEV__ && visible && error) {
      const err = error as { status?: number | string; data?: unknown };
      console.warn('[VisitingProfileModal] Profile load failed', {
        userId,
        status: err?.status,
        data: err?.data,
      });
    }
  }, [visible, error, userId]);

  // Notify parent when user not found (404) so map can clear orphaned cells
  useEffect(() => {
    if (visible && error && (error as { status?: number })?.status === 404 && userId) {
      onUserNotFound?.(userId);
    }
  }, [visible, error, userId, onUserNotFound]);

  const profileErrorMessage =
    error != null
      ? (() => {
          const err = error as { status?: number | string };
          const status = err?.status;
          if (status === 404) return 'User not found';
          if (typeof status === 'number' && status >= 500) return "Couldn't load profile. Tap to try again.";
          if (typeof status === 'string') return "Couldn't load profile. Tap to try again."; // FETCH_ERROR, TIMEOUT_ERROR, etc.
          if (typeof status === 'number' && status >= 400) return "Couldn't load profile. Tap to try again."; // 400, 401, 403, etc.
          return 'Failed to load profile';
        })()
      : 'Failed to load profile';
  const isRetryableError =
    error != null &&
    (() => {
      const s = (error as { status?: number | string })?.status;
      if (s === 404) return false;
      if (typeof s === 'number' && s >= 500) return true;
      if (typeof s === 'string') return true; // FETCH_ERROR, TIMEOUT_ERROR, etc.
      return true; // default: allow retry for other client errors
    })();

  useEffect(() => {
    if (visible && userProfile && currentUser && !isLoading && !error) {
      const currentUserIdStr = String(currentUser._id || '').trim();
      const visitedUserIdStr = String(userId || '').trim();
      
      if (currentUserIdStr !== visitedUserIdStr && trackedUserIdRef.current !== visitedUserIdStr) {
        trackedUserIdRef.current = visitedUserIdStr;
        trackAnotherUserProfileVisit({ visitedUserId: userId }).catch(() => {
          // Silently fail if tracking fails
        });
      }
    }
    
    if (!visible) {
      trackedUserIdRef.current = null;
    }
  }, [visible, userProfile, currentUser, userId, isLoading, error, trackAnotherUserProfileVisit]);

  const profileImageSource = userProfile?.profileGender === 'female' 
    ? require('../../assets/images/profile-female.png')
    : require('../../assets/images/profile.png');

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClosePressOut = useCallback(() => {
    if (Platform.OS === 'android') {
      onClose();
    }
  }, [onClose]);

  const calculateWinPercentage = (successful: number, failed: number): string => {
    const total = successful + failed;
    if (total === 0) return 'N/A';
    return `${Math.round((successful / total) * 100)}%`;
  };

  const handleMessageIconPress = () => {
    if (!onOpenMessages) return;
    onOpenMessages(userId, userProfile?.handle ?? 'Unknown');
  };

  const profileContent = (
    <View style={styles.profileContent}>
      {isLoading ? (
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading...
        </Text>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            {profileErrorMessage}
          </Text>
          {isRetryableError && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary, borderColor: colors.secondary }]}
              onPress={() => refetch()}
              activeOpacity={0.7}
            >
              <Text style={[styles.retryButtonText, { color: colors.background }]}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : userProfile ? (
        <>
          <View style={styles.avatarWrapper}>
            <View style={[styles.avatarContainer, { borderColor: colors.secondary }]}>
              <Image
                source={profileImageSource}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>
            {onOpenMessages && currentUser && String(currentUser._id || (currentUser as any)?.id) !== String(userId) && (
              <TouchableOpacity
                style={styles.profileMessageCircle}
                onPress={handleMessageIconPress}
                activeOpacity={0.7}
                accessibilityLabel="Message"
                accessibilityHint="Open private conversation"
              >
                <Image source={require('../../assets/images/ui/mailbox.png')} style={styles.profileMessageIcon} resizeMode="contain" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.username, { color: colors.text.primary }]}>
            {userProfile.handle}
          </Text>
          <View style={[styles.levelContainer, { backgroundColor: colors.surface, borderColor: colors.secondary }]}>
            <Text style={[styles.levelLabel, { color: colors.text.secondary }]}>
              Level
            </Text>
            <Text style={[styles.levelValue, { color: colors.text.primary }]}>
              {userProfile.level}
            </Text>
          </View>

          {onBlockUser && currentUser && String(currentUser._id || (currentUser as any)?.id) !== String(userId) && (
            <TouchableOpacity
              style={[styles.blockButton, { borderColor: colors.error }]}
              onPress={() => onBlockUser(userId)}
              activeOpacity={0.7}
            >
              <Text style={[styles.blockButtonText, { color: colors.error }]}>Block user</Text>
            </TouchableOpacity>
          )}

          {userProfile.battleStats && (
            <View style={styles.battleStatsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                BATTLE STATISTICS
              </Text>
              <View style={styles.battleStatsGrid}>
                <View style={[styles.battleStatCard, { borderColor: colors.matrix }]}>
                  <Text style={[styles.battleStatLabel, { color: colors.text.secondary }]}>
                    Bots Destroyed
                  </Text>
                  <Text style={[styles.battleStatValue, { color: colors.matrix }]}>
                    {userProfile.battleStats.botsDestroyed}
                  </Text>
                </View>
                <View style={[styles.battleStatCard, { borderColor: colors.matrix }]}>
                  <Text style={[styles.battleStatLabel, { color: colors.text.secondary }]}>
                    Bots Lost
                  </Text>
                  <Text style={[styles.battleStatValue, { color: colors.matrix }]}>
                    {userProfile.battleStats.botsLost}
                  </Text>
                </View>
                <View style={[styles.battleStatCard, { borderColor: colors.matrix }]}>
                  <Text style={[styles.battleStatLabel, { color: colors.text.secondary }]}>
                    Successful Attacks
                  </Text>
                  <Text style={[styles.battleStatValue, { color: colors.matrix }]}>
                    {userProfile.battleStats.successfulAttacks}
                  </Text>
                </View>
                <View style={[styles.battleStatCard, { borderColor: colors.matrix }]}>
                  <Text style={[styles.battleStatLabel, { color: colors.text.secondary }]}>
                    Failed Attacks
                  </Text>
                  <Text style={[styles.battleStatValue, { color: colors.matrix }]}>
                    {userProfile.battleStats.failedAttacks}
                  </Text>
                </View>
                <View style={[styles.battleStatCard, { borderColor: colors.matrix }]}>
                  <Text style={[styles.battleStatLabel, { color: colors.text.secondary }]}>
                    Successful Defenses
                  </Text>
                  <Text style={[styles.battleStatValue, { color: colors.matrix }]}>
                    {userProfile.battleStats.successfulDefenses}
                  </Text>
                </View>
                <View style={[styles.battleStatCard, { borderColor: colors.matrix }]}>
                  <Text style={[styles.battleStatLabel, { color: colors.text.secondary }]}>
                    Failed Defenses
                  </Text>
                  <Text style={[styles.battleStatValue, { color: colors.matrix }]}>
                    {userProfile.battleStats.failedDefenses}
                  </Text>
                </View>
              </View>
              <View style={styles.winPercentageContainer}>
                <View style={[styles.winPercentageItem, { borderColor: colors.matrix }]}>
                  <Text style={[styles.winPercentageLabel, { color: colors.text.secondary }]}>
                    Attack Win %
                  </Text>
                  <Text style={[styles.winPercentageValue, { color: colors.matrix }]}>
                    {calculateWinPercentage(userProfile.battleStats.successfulAttacks, userProfile.battleStats.failedAttacks)}
                  </Text>
                </View>
                <View style={[styles.winPercentageItem, { borderColor: colors.matrix }]}>
                  <Text style={[styles.winPercentageLabel, { color: colors.text.secondary }]}>
                    Defense Win %
                  </Text>
                  <Text style={[styles.winPercentageValue, { color: colors.matrix }]}>
                    {calculateWinPercentage(userProfile.battleStats.successfulDefenses, userProfile.battleStats.failedDefenses)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View
          style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.secondary }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => false}
        >
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.primary, borderColor: colors.secondary },
              pressed && { opacity: 0.7 }
            ]}
            onPress={handleClose}
            onPressOut={handleClosePressOut}
          >
            <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
          </Pressable>

          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.headerLeft} />
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Profile
              </Text>
              <View style={styles.headerRight} />
            </View>

            {Platform.OS === 'ios' ? (
              <GestureScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                bounces={true}
              >
                {profileContent}
              </GestureScrollView>
            ) : (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                bounces={true}
              >
                {profileContent}
              </ScrollView>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const createStyles = (colors: any, themeMode: 'light' | 'dark') => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  modalContainer: {
    width: '60%',
    height: '103%',
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'visible',
    position: 'relative',
    flexDirection: 'column',
  },
  content: {
    padding: SIZING.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZING.spacing.lg,
    paddingBottom: SIZING.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  headerLeft: {
    width: 44,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 40,
    height: 40,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: SIZING.spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: SIZING.spacing.lg,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  profileMessageCircle: {
    position: 'absolute',
    top: -30,
    right: -70,
    width: 115,
    height: 115,
    borderRadius: 57.5, // 115/2 for circle
    borderWidth: 2,
    backgroundColor: themeMode === 'dark' ? 'transparent' : '#9E9E9E',
    borderColor: themeMode === 'dark' ? 'transparent' : '#757575',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMessageIcon: {
    width: 145,
    height: 145,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  username: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.lg,
    textAlign: 'center',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: SIZING.spacing.md,
  },
  levelLabel: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  levelValue: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  blockButton: {
    marginTop: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    alignSelf: 'center',
  },
  blockButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    padding: SIZING.spacing.lg,
  },
  errorText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    padding: SIZING.spacing.lg,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: SIZING.spacing.lg,
  },
  retryButton: {
    marginTop: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
  },
  retryButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: '80%',
  },
  scrollContent: {
    flexGrow: 1,
  },
  battleStatsSection: {
    marginTop: SIZING.spacing.lg,
    width: '100%',
  },
  sectionTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
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
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
    maxWidth: '48%',
  },
  battleStatLabel: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  battleStatValue: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  winPercentageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: SIZING.spacing.md,
  },
  winPercentageItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    alignItems: 'center',
    flex: 1,
  },
  winPercentageLabel: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  winPercentageValue: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
});

