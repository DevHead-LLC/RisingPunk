import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ResearchFeature } from './ResearchFeaturesList';

interface FeatureModalProps {
  visible: boolean;
  feature: ResearchFeature;
  currentBalance: number;
  currentLevel: number;
  onClose: () => void;
  onPerformResearch: (featureId: string, cost: number) => Promise<boolean>;
}

export function FeatureModal({
  visible,
  feature,
  currentBalance,
  currentLevel,
  onClose,
  onPerformResearch,
}: FeatureModalProps) {
  const colors = useThemeColors();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const isLightMode = colors.background === '#FAFAFA' || colors.background === '#F5F5DC';
  
  const canAfford = currentBalance >= feature.unlockCost;
  const meetsLevelRequirement = currentLevel >= feature.levelRequirement;
  
  const handlePerformResearch = async () => {
    if (canAfford && meetsLevelRequirement) {
      setShowComingSoon(true);
      
      setTimeout(() => {
        setShowComingSoon(false);
      }, 2000);
    }
  };

  const renderLockedModal = () => (
    <View style={styles.modalContent}>
      <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
        {feature.name}
      </Text>
      
      <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>
        {feature.description}
      </Text>
      
      <View style={styles.requirementsContainer}>
        <Text style={[styles.requirementsTitle, { color: colors.text.primary }]}>
          Requirements to Unlock:
        </Text>
        
        <View style={styles.requirementRow}>
          <Text style={[styles.requirementLabel, { color: colors.text.secondary }]}>
            Level Required:
          </Text>
          <Text style={[
            styles.requirementValue,
            { color: meetsLevelRequirement ? colors.success : colors.error }
          ]}>
            {currentLevel}/{feature.levelRequirement}
          </Text>
        </View>
        
        <View style={styles.requirementRow}>
          <Text style={[styles.requirementLabel, { color: colors.text.secondary }]}>
            Balance Required:
          </Text>
          <Text style={[
            styles.requirementValue,
            { color: canAfford ? colors.success : colors.error }
          ]}>
            ${feature.unlockCost.toLocaleString()}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.primary }]}
        onPress={onClose}
      >
        <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderUnlockedModal = () => (
    <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#8B5CF6' }]}>
        {feature.name}
      </Text>

      <Text style={[styles.modalDescription, { color: isLightMode ? '#374151' : '#CBD5E1' }]}>
        {feature.description}
      </Text>
      
      <View style={styles.researchInfoContainer}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: '#8B5CF6', textDecorationLine: 'underline' }]}>
            Research Cost:
          </Text>
          <Text style={[styles.infoValue, { color: isLightMode ? '#374151' : '#F1F5F9' }]}>
            ${feature.unlockCost.toLocaleString()}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: '#8B5CF6', textDecorationLine: 'underline' }]}>
            Research Time:
          </Text>
          <Text style={[styles.infoValue, { color: isLightMode ? '#374151' : '#F1F5F9' }]}>
            24 hours
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.researchButton,
          {
            backgroundColor: canAfford ? '#7C3AED' : '#EF4444',
            opacity: canAfford ? 1 : 0.6
          }
        ]}
        onPress={handlePerformResearch}
        disabled={!canAfford}
      >
        <Text style={[styles.researchButtonText, { color: '#FFFFFF' }]}>
          {canAfford ? 'Perform Research' : 'Insufficient Funds'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: '#475569' }]}
        onPress={onClose}
      >
        <Text style={[styles.closeButtonText, { color: '#FFFFFF' }]}>
          Close
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderComingSoonOverlay = () => (
    <View style={styles.comingSoonOverlay}>
      <View style={[
        styles.comingSoonContent,
        {
          backgroundColor: colors.background,
          borderColor: colors.matrix,
        }
      ]}>
        <Text style={[
          styles.comingSoonText,
          { color: colors.matrix }
        ]}>Coming Soon</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
      statusBarTranslucent={false}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.modal,
          {
            backgroundColor: colors.background,
            borderColor: colors.primary
          }
        ]}>
          {feature.isUnlocked ? renderUnlockedModal() : renderLockedModal()}
          {showComingSoon && renderComingSoonOverlay()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.md,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 2,
    padding: SIZING.spacing.lg,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    lineHeight: 20,
  },
  requirementsContainer: {
    width: '100%',
    marginBottom: SIZING.spacing.lg,
  },
  requirementsTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  requirementLabel: {
    fontSize: SIZING.font.body,
  },
  requirementValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  researchInfoContainer: {
    width: '100%',
    marginBottom: SIZING.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  infoLabel: {
    fontSize: SIZING.font.body,
  },
  infoValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  researchButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    marginBottom: SIZING.spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  researchButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comingSoonContent: {
    padding: SIZING.spacing.lg,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  comingSoonText: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
});
