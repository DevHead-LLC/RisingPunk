import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Image, ScrollView, Platform, Pressable, Dimensions } from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useGetUserProfileQuery } from '../../store/api/authApi';
import { useAppSelector } from '../../store/hooks';
import { useTrackAnotherUserProfileVisitMutation } from '../../store/api/userGuideApi';

interface VisitingProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

export const VisitingProfileModal: React.FC<VisitingProfileModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const colors = useThemeColors();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { data: userProfile, isLoading, error } = useGetUserProfileQuery(userId, {
    skip: !visible || !userId,
  });
  const [trackAnotherUserProfileVisit] = useTrackAnotherUserProfileVisitMutation();
  const trackedUserIdRef = useRef<string | null>(null);
  const styles = createStyles(colors);

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

  const profileContent = (
    <View style={styles.profileContent}>
      {isLoading ? (
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Loading...
        </Text>
      ) : error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to load profile
        </Text>
      ) : userProfile ? (
        <>
          <View style={[styles.avatarContainer, { borderColor: colors.secondary }]}>
            <Image
              source={profileImageSource}
              style={styles.avatarImage}
              resizeMode="contain"
            />
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
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Profile
              </Text>
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

const createStyles = (colors: any) => StyleSheet.create({
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
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZING.spacing.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
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

