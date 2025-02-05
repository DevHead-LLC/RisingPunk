import React, {memo, useRef, useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Image, Text, Animated, Alert} from 'react-native';
import { COLORS, SIZING } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';

type Props = {
  onPress: () => void;
  onNavigateToBattle: () => void;
};

export const HackRigDisplay = ({ onPress, onNavigateToBattle }: Props) => {
  const { user, unlockHackRig } = useAuth();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const isLocked = !user?.unlockedFeatures?.hackRig;

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
      await unlockHackRig();
      setIsAlertOpen(false);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      onNavigateToBattle();
    } catch (error) {
      console.error('Failed to navigate to battle:', error);
    }
  };

  const handlePress = () => {
    setIsAlertOpen(true);
    startPulseAnimation();

    Alert.alert(
      "System Breach Detected",
      "TESLA_GRID has root access to your system. Shell injection detected in Hack Rig kernel.\n\nInitiate countermeasures to regain control.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setIsAlertOpen(false);
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
          }
        },
        {
          text: "EXECUTE EXPLOIT",
          onPress: handleExploit,
          style: "destructive"
        }
      ]
    );
  };

  return (
    <Animated.View
      style={[
        styles.moduleContainer,
        isLocked && styles.moduleDisabled,
        isAlertOpen && styles.warningBorder,
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <TouchableOpacity 
        style={styles.touchable}
        onPress={isLocked ? handlePress : onPress}
      >
        <View style={styles.imageContainer}>
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
          <Text style={styles.moduleTitle}>HACK RIG</Text>
          <Text style={styles.moduleDescription}>Access the network</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  moduleContainer: {
    width: '45%',
    aspectRatio: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.secondary,
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    marginBottom: SIZING.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.matrix,
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
    color: '#b39ddb',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  moduleDescription: {
    color: '#9C27B0',
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
  }
}); 