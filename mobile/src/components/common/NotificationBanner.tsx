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
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  visible,
  message,
  type = 'info',
  duration = 5000,
  onClose,
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
  }, [visible, fadeAnim, duration, onClose]);

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
          backgroundColor: getBannerColor(),
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.bannerContent}>
        <Text style={[styles.bannerText, { color: '#FFFFFF' }]}>
          {message}
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 50, // Account for status bar
    paddingBottom: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: SIZING.spacing.xs,
    marginLeft: SIZING.spacing.sm,
  },
  closeButtonText: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
});
