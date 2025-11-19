import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Image } from 'react-native';
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
                </>
              ) : null}
            </View>
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
});

