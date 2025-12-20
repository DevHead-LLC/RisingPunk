import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Image, ScrollView } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useGetUserProfileQuery } from '../../store/api/authApi';

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
  const { data: userProfile, isLoading, error } = useGetUserProfileQuery(userId, {
    skip: !visible || !userId,
  });
  const styles = createStyles(colors);

  const profileImageSource = userProfile?.profileGender === 'female' 
    ? require('../../assets/images/profile-female.png')
    : require('../../assets/images/profile.png');

  const calculateWinPercentage = (successful: number, failed: number): string => {
    const total = successful + failed;
    if (total === 0) return 'N/A';
    return `${Math.round((successful / total) * 100)}%`;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.secondary }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView style={styles.content}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Profile
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.primary, borderColor: colors.secondary }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 500,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    padding: SIZING.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.lg,
    paddingBottom: SIZING.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    marginTop: -2,
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
    fontSize: SIZING.font.h3,
    fontWeight: 'bold',
  },
});

