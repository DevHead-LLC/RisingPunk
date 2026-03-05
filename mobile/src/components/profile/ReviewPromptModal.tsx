import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { getReviewUrlForOpen } from '../../constants/updateUrls';

interface ReviewPromptModalProps {
  visible: boolean;
  onClose: () => void;
  onClaimReward: () => Promise<{ alreadyClaimed?: boolean } | void>;
  hasClaimedReviewReward: boolean;
  /** On iOS/Android we do not grant in-game reward (App Store and Play policies prohibit incentivized reviews); on web/other we do. */
  grantRewardOnOpen: boolean;
}

export function ReviewPromptModal({
  visible,
  onClose,
  onClaimReward,
  hasClaimedReviewReward,
  grantRewardOnOpen,
}: ReviewPromptModalProps) {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleOpenReview = useCallback(async () => {
    const url = await getReviewUrlForOpen();
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      // Fallback: try open anyway
      Linking.openURL(url).catch(() => {});
    }
    if (grantRewardOnOpen && !hasClaimedReviewReward) {
      setIsLoading(true);
      try {
        await onClaimReward();
      } catch (e) {
        Alert.alert('Error', 'Could not apply reward. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    onClose();
  }, [grantRewardOnOpen, hasClaimedReviewReward, onClaimReward, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.matrix }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Leave us a rating
          </Text>
          <Text style={[styles.body, { color: colors.text.secondary }]}>
            We'd love to hear from you. Your feedback helps us improve.
          </Text>
          <Text style={[styles.support, { color: colors.text.secondary }]}>
            Don't like something? Please send us a review so we can fix it for you at support@risingpunk.com.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.matrix }]}
              onPress={handleOpenReview}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                  {grantRewardOnOpen && !hasClaimedReviewReward
                    ? 'Review us and receive an award'
                    : 'Leave a rating'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.text.secondary }]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text.secondary }]}>
                Maybe later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    padding: SIZING.spacing.lg,
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  body: {
    fontSize: SIZING.font.medium,
    marginBottom: SIZING.spacing.sm,
    lineHeight: 22,
  },
  support: {
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
    marginBottom: SIZING.spacing.lg,
    lineHeight: 20,
  },
  actions: {
    gap: SIZING.spacing.sm,
  },
  primaryButton: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: SIZING.font.medium,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: SIZING.font.medium,
  },
});
