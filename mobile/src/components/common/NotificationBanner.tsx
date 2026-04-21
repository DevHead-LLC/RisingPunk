import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';

interface NotificationBannerProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  /** Auto-dismiss only: fired once when the outro fade begins (before {@link onClose}). AppContent uses this so other toasts are not gated until `onClose` clears parent state (Bugbot / ios-bugs.md). */
  onHideAnimationStart?: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  visible,
  message,
  type = 'info',
  duration = 5000,
  onClose,
  onHideAnimationStart,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const colors = useThemeColors();

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto fade out after duration
      const timer = setTimeout(() => {
        onHideAnimationStart?.();
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onClose?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, fadeAnim, duration, onClose, onHideAnimationStart]);

  if (!visible) return null;

  const getBannerColor = () => {
    switch (type) {
      case 'success':
        return colors.matrix;
      case 'error':
        return colors.error;
      case 'info':
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.bannerContent}>
        <Text style={[styles.bannerText, { color: colors.matrix }]}>
          {message}
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.matrix }]}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: '50%',
    left: '10%', // 10% margin on each side = 80% width
    right: '10%',
    transform: [{ translateY: -40 }], // Center vertically
    zIndex: 1000,
    backgroundColor: '#000000', // Black background
    borderWidth: 2,
    borderColor: '#A239CA', // Pink border
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.md,
    alignSelf: 'center',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeButton: {
    padding: SIZING.spacing.xs,
    marginLeft: SIZING.spacing.sm,
  },
  closeButtonText: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
  },
});
