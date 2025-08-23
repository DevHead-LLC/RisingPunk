import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZING } from '../../styles/theme';
import { DevelopmentIcon, LockedFeatureModal } from './index';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../context/ThemeContext';

interface FutureBuildingPlaceholderProps {
  propertyNumber: number;
}

export const FutureBuildingPlaceholder: React.FC<FutureBuildingPlaceholderProps> = ({ propertyNumber }) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const [showLockedModal, setShowLockedModal] = useState(false);

  const containerStyle = [
    styles.placeholderContainer
  ];

  const propertyNumberStyle = [
    styles.propertyNumber,
    {
      color: themeMode === 'light' ? '#FFFFFF' : colors.matrix
    }
  ];

  const getUnlockMessage = () => {
    switch (propertyNumber) {
      case 2:
        return "Unlock Property 1 to Enable";
      case 3:
        return "Unlock Properties 1 and 2 to Enable";
      case 4:
        return "Unlock Properties 1-3 to Enable";
      default:
        return "Property Locked";
    }
  };

  const handlePress = () => {
    setShowLockedModal(true);
  };

  return (
    <View style={containerStyle}>
      <View style={styles.iconWrapper}>
        <TouchableOpacity onPress={handlePress} style={styles.lockOverlay}>
          <View style={styles.lockIcon}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        </TouchableOpacity>
        <DevelopmentIcon
          isBuilding={false}
          isUnlocked={false}
          emptyImage={require('../../assets/images/emptyResidential.png')}
          completedImage={require('../../assets/images/emptyResidential.png')}
          onPress={handlePress}
          size={100}
          iconSize={85}
        />
        <Text style={propertyNumberStyle}>{propertyNumber}</Text>
      </View>
      
              <LockedFeatureModal
          visible={showLockedModal}
          title="PROPERTY LOCKED"
          message={getUnlockMessage()}
          onClose={() => setShowLockedModal(false)}
          closeButtonText="OK"
        />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    backgroundColor: 'transparent',
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyNumber: {
    position: 'absolute',
    top: 15,
    right: 12,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#666',
  },
  lockText: {
    fontSize: 20,
    color: '#666',
  },
});
