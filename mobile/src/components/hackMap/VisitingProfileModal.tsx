import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions, Platform, Pressable } from 'react-native';
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

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClosePressOut = useCallback(() => {
    if (Platform.OS === 'android') {
      onClose();
    }
  }, [onClose]);

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
    width: '80%',
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
});

