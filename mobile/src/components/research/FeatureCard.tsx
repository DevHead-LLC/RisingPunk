import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ImageSourcePropType,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

export interface ResearchFeatureRef {
  categoryId: string;
  featureId: string;
}

export interface ResearchFeature {
  id: string;
  name: string;
  description: string;
  unlockCost: number;
  levelRequirement: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  researchTimeHours?: number;
  isResearching?: boolean;
  researchStartedAt?: Date;
  researchCompletesAt?: Date;
  /** Feature(s) that must be unlocked before this feature can be started. */
  requiredFeatureRefs?: ResearchFeatureRef[];
  /** Required Research Center building level (1–4). */
  researchCenterLevelRequirement?: number;
  effect: {
    type: 'unlock' | 'improvement' | 'reduction' | 'special';
    value: number | string;
    target?: string;
  };
}

interface FeatureCardProps {
  feature: ResearchFeature;
  timerRemaining: number;
  currentBalance: number;
  isLightMode: boolean;
  onPress: () => void;
  backgroundImage?: ImageSourcePropType;
}

const BACKGROUND_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'antivirus': require('../../assets/images/antivirusResearch.png'),
  'add-battalion-c': require('../../assets/images/researchCenter/increaseBattalions.png'),
  'battalion-size-250': require('../../assets/images/researchCenter/increaseBots250.png'),
  'battalion-size-500': require('../../assets/images/researchCenter/increaseBots250.png'),
  'battalion-size-1000': require('../../assets/images/researchCenter/increaseBots250.png'),
  'add-battalion-d': require('../../assets/images/researchCenter/increaseBattalions.png'),
  'add-battalion-e': require('../../assets/images/researchCenter/increaseBattalions.png'),
  'bot-trap': require('../../assets/images/botTrapResearch.png'),
  'crew-system-unlock': require('../../assets/images/startCrew.png'),
  'rental-profit-01': require('../../assets/images/researchCenter/rentalPropertyIncrease.png'),
  'rental-profit-015': require('../../assets/images/researchCenter/rentalPropertyIncrease.png'),
  'increase-income-01': require('../../assets/images/researchCenter/incomeIncrease.png'),
  'increase-income-02': require('../../assets/images/researchCenter/incomeIncrease.png'),
  'increase-income-025': require('../../assets/images/researchCenter/incomeIncrease.png'),
  'increase-income-03': require('../../assets/images/researchCenter/incomeIncrease.png'),
  'reduce-insurance-01': require('../../assets/images/researchCenter/decreaseInsurance.png'),
  'reduce-insurance-02': require('../../assets/images/researchCenter/decreaseInsurance.png'),
  'reduce-tax-expense-02': require('../../assets/images/researchCenter/taxExpenseReduction.png'),
  'probe': require('../../assets/images/researchCenter/increaseBattalions.png'),
};

export function FeatureCard({
  feature,
  timerRemaining,
  currentBalance,
  isLightMode,
  onPress,
  backgroundImage,
}: FeatureCardProps) {
  const colors = useThemeColors();
  const isActuallyUnlocked = feature.isUnlocked || (feature.isResearching && timerRemaining === 0);
  
  const imageSource = backgroundImage || BACKGROUND_IMAGE_MAP[feature.id];
  const hasBackgroundImage = !!imageSource;

  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderFeatureContent = () => (
    <View style={styles.featureContent}>
      {!isActuallyUnlocked && (
        <View style={[
          styles.featureIcon,
          {
            backgroundColor: isLightMode ? '#F3F4F6' : 'rgba(255, 255, 255, 0.1)',
            borderColor: isLightMode ? '#D1D5DB' : 'rgba(255, 255, 255, 0.2)',
            borderWidth: isLightMode ? 1 : 0
          }
        ]}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
      
      <View style={styles.featureNameContainer}>
        <Text style={[
          styles.featureName, 
          { 
            color: isLightMode ? '#FFFFFF' : '#00FF00',
            fontWeight: '600'
          }
        ]}>
          {feature.name}
        </Text>
      </View>
      
      <View style={[
        styles.featureStatus,
        {
          backgroundColor: isLightMode ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.7)',
          borderColor: feature.isResearching ? (isLightMode ? '#BBF7D0' : '#10B981') :
                      feature.isUnlocked ? (isLightMode ? '#BFDBFE' : '#3B82F6') :
                      (isLightMode ? '#FECACA' : 'transparent'),
          borderWidth: isLightMode ? 1 : 0,
          zIndex: feature.isUnlocked ? 2 : 0
        }
      ]}>
        <Text style={[
          styles.statusText,
          { 
            color: feature.isResearching ? (isLightMode ? '#059669' : '#10B981') :
                  feature.isUnlocked ? (isLightMode ? '#2563EB' : '#3B82F6') :
                  currentBalance >= feature.unlockCost ? (isLightMode ? '#2563EB' : '#3B82F6') : (isLightMode ? '#DC2626' : colors.error),
            fontWeight: '600'
          }
        ]}>
          {feature.isResearching && timerRemaining > 0 ? 
            formatTimeRemaining(timerRemaining) :
            `$${feature.unlockCost.toLocaleString()}`}
        </Text>
      </View>
    </View>
  );

  const renderDisabledOverlay = () => {
    if (isActuallyUnlocked) {
      return null;
    }
    
    return (
      <View style={[
        styles.disabledOverlay,
        {
          backgroundColor: isLightMode ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.4)'
        }
      ]} />
    );
  };

  const cardStyle = [
    styles.featureCard,
    hasBackgroundImage ? {
      borderColor: isLightMode ? '#3B82F6' : '#00FF00',
      borderWidth: isLightMode ? 1 : 1,
      shadowColor: isLightMode ? '#000000' : '#000000',
      shadowOpacity: isLightMode ? 0.1 : 0.1,
      shadowRadius: isLightMode ? 4 : 4,
      elevation: isLightMode ? 2 : 3,
      opacity: 0.8,
      overflow: 'hidden' as const
    } : {
      backgroundColor: isLightMode ? '#FFFFFF' : colors.surface,
      borderColor: isLightMode ? '#3B82F6' : '#00FF00',
      borderWidth: isLightMode ? 1 : 1,
      shadowColor: isLightMode ? '#000000' : '#000000',
      shadowOpacity: isLightMode ? 0.1 : 0.1,
      shadowRadius: isLightMode ? 4 : 4,
      elevation: isLightMode ? 2 : 3,
      opacity: 0.8
    }
  ];

  const content = (
    <>
      {isActuallyUnlocked && hasBackgroundImage ? (
        <View style={styles.antivirusContent}>
          <View style={styles.featureNameContainer}>
            <Text style={[
              styles.antivirusTitle,
              { 
                color: isLightMode ? '#FFFFFF' : '#00FF00',
                fontWeight: '600'
              }
            ]}>
              {feature.name}
            </Text>
          </View>
        </View>
      ) : (
        renderFeatureContent()
      )}
      {renderDisabledOverlay()}
      {isActuallyUnlocked && (
        <View style={styles.completionCheckmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </>
  );

  return (
    <TouchableOpacity 
      key={feature.id} 
      style={cardStyle}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {hasBackgroundImage ? (
        <ImageBackground
          source={imageSource}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {content}
        </ImageBackground>
      ) : (
        content
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  featureCard: {
    width: '48%',
    height: 120,
    borderRadius: 12,
    padding: SIZING.spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: SIZING.spacing.md,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZING.spacing.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  lockIcon: {
    fontSize: 24,
  },
  featureNameContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignSelf: 'center',
  },
  featureName: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  featureStatus: {
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.xs,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
  },
  disabledOverlay: {
    position: 'absolute',
    top: -SIZING.spacing.md,
    left: -SIZING.spacing.md,
    right: -SIZING.spacing.md,
    bottom: -SIZING.spacing.md,
    borderRadius: 12,
    pointerEvents: 'none',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  antivirusContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  antivirusTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  completionCheckmark: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

