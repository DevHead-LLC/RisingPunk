import React, {memo, useState} from 'react';
import {TouchableOpacity, View, Text, Image, StyleSheet, Modal} from 'react-native';
import {COLORS, SIZING} from '../../styles/theme';

type ResearchCenterLocationProps = {
  onPress?: () => void;
};

export const ResearchCenterLocation = memo(function ResearchCenterLocation({ onPress }: ResearchCenterLocationProps) {
  const [showPopup, setShowPopup] = useState(false);

  const handlePress = () => {
    setShowPopup(true);
  };

  const handleBuild = () => {
    setShowPopup(false);
    if (onPress) onPress();
  };

  const handleClose = () => {
    setShowPopup(false);
  };

  return (
    <View style={styles.researchCenterContainer}>
      <TouchableOpacity
        style={styles.location}
        onPress={handlePress}
      >
        <View style={styles.iconContainer}>
          <Image
            source={require('../../assets/images/dirt.png')}
            style={styles.locationIcon}
          />
        </View>
        <Text style={styles.locationLabel}>RESEARCH CENTER</Text>
      </TouchableOpacity>

      <Modal
        visible={showPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
        supportedOrientations={['landscape']}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          onPress={handleClose} 
          activeOpacity={1}
        >
          <TouchableOpacity 
            style={styles.popup} 
            onPress={() => {}} 
            activeOpacity={1}
          >
            <Text style={styles.popupTitle}>Build Research Center</Text>
            <Text style={styles.popupPrice}>$50,000</Text>
            <Text style={styles.buildTime}>Time to build: 1 hour</Text>
            <TouchableOpacity style={styles.buildButton} onPress={handleBuild}>
              <Text style={styles.buildButtonText}>Build Research Center</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  researchCenterContainer: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: [{translateX: -150}],
    width: 300,
    height: 200,
    backgroundColor: 'rgba(0, 255, 65, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.2)',
    borderRadius: 8,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  location: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
    height: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.matrix,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain' as const,
  },
  locationLabel: {
    color: COLORS.secondary,
    fontSize: SIZING.font.body,
    letterSpacing: 2,
    textAlign: 'center',
    position: 'absolute',
    top: '100%',
    marginTop: 20,
    width: 200,
    left: -40,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  popup: {
    backgroundColor: COLORS.background,
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.matrix,
    alignItems: 'center',
    minWidth: 400,
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  popupTitle: {
    color: COLORS.secondary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  popupPrice: {
    color: COLORS.matrix,
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  buildTime: {
    color: COLORS.secondary,
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  buildButton: {
    backgroundColor: COLORS.matrix,
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 6,
    marginBottom: SIZING.spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  buildButtonText: {
    color: COLORS.background,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.matrix,
    borderRadius: 4,
  },
  closeButtonText: {
    color: COLORS.secondary,
    fontSize: SIZING.font.small,
    textAlign: 'center',
  },
});
