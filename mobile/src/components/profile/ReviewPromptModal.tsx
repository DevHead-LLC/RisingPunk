import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Play Store' : 'the store';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { openReviewUrl } from '../../utils/openReviewAndClaimReward';

interface ReviewPromptModalProps {
  visible: boolean;
  onClose: () => void;
  /** Current user ID so review-opened state is stored per user (multi-user on same device). */
  userId: string | null;
}

export function ReviewPromptModal({
  visible,
  onClose,
  userId,
}: ReviewPromptModalProps) {
  const colors = useThemeColors();

  const handleOpenReview = useCallback(async () => {
    await openReviewUrl(userId);
    onClose();
  }, [onClose, userId]);

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
            Rate us on the {STORE_NAME}
          </Text>
          <Text style={[styles.body, { color: colors.text.secondary }]}>
            We'd love to hear from you. Your rating and review in the {STORE_NAME} helps us improve.
          </Text>
          <Text style={[styles.support, { color: colors.text.secondary }]}>
            Having an issue or something negative to report? Contact us at support@risingpunk.com and we'll do our best to help.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.matrix }]}
              onPress={handleOpenReview}
            >
              <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                Leave a rating on the {STORE_NAME}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.text.secondary }]}
              onPress={onClose}
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
