import React, {useRef, useState, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Image, Text, Animated} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useAppSelector } from '../../store/hooks';
import { useThemeColors } from '../../hooks/useThemeColors';
import { API_URL } from '../../config';
import { SystemBreachModal } from './SystemBreachModal';

type Props = {
  onPress: () => void;
  onNavigateToBattle: () => void;
  isHighlighted?: boolean;
  onHighlightPress?: () => void;
};

export const HackRigDisplay = ({ onPress, onNavigateToBattle, isHighlighted = false, onHighlightPress }: Props) => {
  const colors = useThemeColors();
  const user = useAppSelector((state) => state.auth.user);
  const token = useAppSelector((state) => state.auth.token);
  const [isLocked, setIsLocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [showSystemBreachModal, setShowSystemBreachModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useRef(new Animated.Value(0)).current;
  
  const highlightColors = [colors.primary, colors.secondary, colors.matrix];

  // Fetch hack rig status from database on component mount
  useEffect(() => {
    const fetchHackRigStatus = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setIsLocked(!userData.unlockedFeatures?.hackRig);
        }
      } catch (error) {
        console.error('Failed to fetch hack rig status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHackRigStatus();
  }, [token]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleExploit = async () => {
    try {
      setIsAlertOpen(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      onNavigateToBattle();
    } catch (error) {
      console.error('Failed to navigate to battle:', error);
    }
  };

  const handlePress = () => {
    // If highlighted and onHighlightPress provided, call it but still show modal
    if (isHighlighted && onHighlightPress) {
      onHighlightPress();
      // Continue to show modal - don't return early
    }
    setIsAlertOpen(true);
    startPulseAnimation();
    setShowSystemBreachModal(true);
  };

  useEffect(() => {
    if (isHighlighted) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % highlightColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isHighlighted, highlightColors.length]);

  useEffect(() => {
    if (isHighlighted) {
      Animated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isHighlighted, animatedBorderColor]);

  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: highlightColors,
  });

  // Show loading state while fetching
  if (isLoading) {
    return (
      <View style={[styles.moduleContainer, styles.moduleDisabled, { 
        backgroundColor: colors.accent + 'E6',
        borderColor: colors.secondary 
      }]}>
        <View style={styles.touchable}>
          <View style={[styles.imageContainer, { 
            backgroundColor: colors.inputBg + '4D',
            borderColor: colors.matrix 
          }]}>
            <Image
              source={require('../../assets/images/hacker-rig.png')}
              style={styles.moduleImage}
            />
            <View style={styles.lockOverlay}>
              <Text style={styles.lockText}>🔒</Text>
            </View>
          </View>
          <View style={styles.moduleTextContainer}>
            <Text style={[styles.moduleTitle, { color: colors.primary }]}>HACK RIG</Text>
            <Text style={[styles.moduleDescription, { color: colors.text.secondary }]}>Loading...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.moduleContainer,
        { 
          backgroundColor: colors.accent + 'E6',
          borderColor: isHighlighted ? undefined : colors.secondary,
          borderWidth: isHighlighted ? 3 : 2,
        },
        isLocked && styles.moduleDisabled,
        isAlertOpen && styles.warningBorder,
        { transform: [{ scale: pulseAnim }] },
        isHighlighted && { zIndex: 1000 },
      ]}
    >
      {isHighlighted && (
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            {
              borderWidth: 3,
              borderColor: animatedBorderColorValue,
              borderRadius: 8,
            }
          ]} 
          pointerEvents="none"
        />
      )}
      <TouchableOpacity
        style={styles.touchable}
        onPress={isHighlighted && onHighlightPress ? handlePress : (isLocked ? handlePress : onPress)}
      >
        <View style={[styles.imageContainer, { 
          backgroundColor: colors.inputBg + '4D',
          borderColor: colors.matrix 
        }]}>
          <Image
            source={require('../../assets/images/hacker-rig.png')}
            style={styles.moduleImage}
          />
          {isLocked && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockText}>🔒</Text>
            </View>
          )}
        </View>
        <View style={styles.moduleTextContainer}>
          <Text style={[styles.moduleTitle, { color: colors.primary }]}>HACK RIG</Text>
          <Text style={[styles.moduleDescription, { color: colors.text.secondary }]}>Access the network</Text>
        </View>
      </TouchableOpacity>
      
      <SystemBreachModal
        visible={showSystemBreachModal}
        onCancel={() => {
          setShowSystemBreachModal(false);
          setIsAlertOpen(false);
          pulseAnim.stopAnimation();
          pulseAnim.setValue(1);
        }}
        onExecuteExploit={() => {
          setShowSystemBreachModal(false);
          handleExploit();
        }}
        highlightExecuteButton={isHighlighted}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  moduleContainer: {
    width: '45%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
    padding: SIZING.spacing.sm,
  },
  warningBorder: {
    borderColor: '#FF4500',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 4,
    marginBottom: SIZING.spacing.sm,
    borderWidth: 1,
    padding: SIZING.spacing.xs,
  },
  moduleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  moduleTextContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  moduleTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  moduleDescription: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
  },
  lockText: {
    fontSize: 32,
  },
  moduleDisabled: {
    opacity: 0.5,
  },
});
