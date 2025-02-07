import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { COLORS, SIZING } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import BattalionSelectModal from '../components/battle/BattalionSelectModal';

type Props = {
  onClose: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BattlePreparationScreen = ({ onClose }: Props) => {
  const { unlockHackRig } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBattalion, setSelectedBattalion] = useState<'A' | 'B' | null>(null);

  const handleTempUnlock = async () => {
    try {
      await unlockHackRig();
      onClose();
    } catch (error) {
      console.error('Failed to unlock hack rig:', error);
    }
  };

  const handleBattalionPress = (battalion: 'A' | 'B') => {
    setSelectedBattalion(battalion);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      
      <View style={styles.header}>
        <Text style={styles.systemText}>[SYSTEM: TESLA_GRID]</Text>
        <Text style={styles.statusText}>STATUS: COMBAT READY</Text>
      </View>

      {/* Debug button floating */}
      <TouchableOpacity style={styles.tempUnlockButton} onPress={handleTempUnlock}>
        <Text style={styles.tempUnlockText}>DEBUG: Force Unlock</Text>
      </TouchableOpacity>

      <ScrollView 
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Friendly Forces Page */}
        <View style={styles.page}>
          <Text style={styles.pageTitle}>FRIENDLY FORCES</Text>
          <View style={styles.friendlyFormationContainer}>
            {/* Locked Battalions */}
            <View style={styles.battalionLines}>
              <View style={styles.battalionRow}>
                <View style={[styles.slot, styles.lockedSlot]}>
                  <Text style={[styles.slotText, styles.lockedText]}>BATTALION C</Text>
                  <Text style={[styles.deployText, styles.lockedText]}>+ Deploy</Text>
                  <Text style={styles.lockText}>🔒</Text>
                </View>
                <View style={[styles.slot, styles.lockedSlot]}>
                  <Text style={[styles.slotText, styles.lockedText]}>BATTALION D</Text>
                  <Text style={[styles.deployText, styles.lockedText]}>+ Deploy</Text>
                  <Text style={styles.lockText}>🔒</Text>
                </View>
              </View>

              <View style={styles.battalionRow}>
                <View style={[styles.slot, styles.lockedSlot]}>
                  <Text style={[styles.slotText, styles.lockedText]}>BATTALION E</Text>
                  <Text style={[styles.deployText, styles.lockedText]}>+ Deploy</Text>
                  <Text style={styles.lockText}>🔒</Text>
                </View>
                <View style={[styles.slot, styles.lockedSlot]}>
                  <Text style={[styles.slotText, styles.lockedText]}>BATTALION F</Text>
                  <Text style={[styles.deployText, styles.lockedText]}>+ Deploy</Text>
                  <Text style={styles.lockText}>🔒</Text>
                </View>
              </View>

              {/* Active Battalions */}
              <View style={styles.battalionRow}>
                <TouchableOpacity 
                  style={[styles.slot, styles.activeSlot]}
                  onPress={() => handleBattalionPress('A')}
                >
                  <Text style={styles.slotText}>BATTALION A</Text>
                  <Text style={styles.deployText}>+ Deploy</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.slot, styles.activeSlot]}
                  onPress={() => handleBattalionPress('B')}
                >
                  <Text style={styles.slotText}>BATTALION B</Text>
                  <Text style={styles.typeText}>MK.I BREACHER</Text>
                  <Text style={styles.countText}>250</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Front line circles */}
            <View style={styles.friendlyFrontLine}>
              <View style={[styles.circleSlot, styles.lockedSlot]}>
                <Text style={styles.lockText}>🔒</Text>
              </View>
              <View style={[styles.circleSlot, styles.lockedSlot]}>
                <Text style={styles.lockText}>🔒</Text>
              </View>
              <View style={[styles.circleSlot, styles.lockedSlot]}>
                <Text style={styles.lockText}>🔒</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Enemy Forces Page - Mirror of friendly forces */}
        <View style={styles.page}>
          <Text style={styles.pageTitle}>ENEMY FORCES</Text>
          <View style={styles.enemyFormationContainer}>
            <View style={styles.enemyFrontLine}>
              <View style={[styles.circleSlot, styles.enemySlot]}>
                <Text style={styles.enemyText}>???</Text>
              </View>
              <View style={[styles.circleSlot, styles.enemySlot]}>
                <Text style={styles.enemyText}>???</Text>
              </View>
              <View style={[styles.circleSlot, styles.enemySlot]}>
                <Text style={styles.enemyText}>???</Text>
              </View>
            </View>

            <View style={styles.battalionLines}>
              {[1, 2, 3].map((row) => (
                <View key={row} style={styles.battalionRow}>
                  <View style={[styles.slot, styles.enemySlot]}>
                    <Text style={styles.enemyText}>UNKNOWN</Text>
                    <Text style={styles.scanText}>SCANNING...</Text>
                  </View>
                  <View style={[styles.slot, styles.enemySlot]}>
                    <Text style={styles.enemyText}>UNKNOWN</Text>
                    <Text style={styles.scanText}>SCANNING...</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.initiateButton}>
        <Text style={styles.initiateText}> EXECUTE BATTLE SEQUENCE_</Text>
      </TouchableOpacity>

      <BattalionSelectModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={(type, quantity) => {
          console.log(`Deploying ${quantity} ${type} to Battalion ${selectedBattalion}`);
          setModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 65, 0.2)',
  },
  systemText: {
    color: '#4717F6',
    fontSize: SIZING.font.small,
    fontFamily: 'monospace',
  },
  statusText: {
    color: '#00FF41',
    fontSize: SIZING.font.small,
    fontFamily: 'monospace',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    paddingVertical: SIZING.spacing.lg,
  },
  pageTitle: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.small,
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    fontFamily: 'monospace',
  },
  friendlyFormationContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
  },
  friendlyFrontLine: {
    marginLeft: SIZING.spacing.lg,
    gap: SIZING.spacing.lg,
  },
  enemyFormationContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
  },
  enemyFrontLine: {
    marginRight: SIZING.spacing.lg,
    gap: SIZING.spacing.lg,
  },
  battalionLines: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  battalionRow: {
    flexDirection: 'column',
    gap: SIZING.spacing.md,
  },
  slot: {
    width: 120,
    height: 70,
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.xs,
  },
  lockedSlot: {
    opacity: 0.5,
    backgroundColor: 'rgba(26, 77, 51, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  enemySlot: {
    backgroundColor: 'rgba(246, 23, 23, 0.1)',
    borderColor: 'rgba(246, 23, 23, 0.3)',
  },
  slotText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  deployText: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.small,
    marginBottom: 2,
  },
  lockText: {
    position: 'absolute',
    color: COLORS.text.secondary,
    fontSize: SIZING.font.small,
  },
  lockedText: {
    opacity: 0.7,
  },
  enemyText: {
    color: 'rgba(246, 23, 23, 0.8)',
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  scanText: {
    color: 'rgba(246, 23, 23, 0.5)',
    fontSize: SIZING.font.small,
    marginTop: 4,
  },
  tempUnlockButton: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    padding: SIZING.spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 4,
    zIndex: 1,
  },
  tempUnlockText: {
    color: '#FF4B4B',
    fontSize: SIZING.font.small,
    fontFamily: 'monospace',
  },
  initiateButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(71, 23, 246, 0.2)',
    padding: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(71, 23, 246, 0.4)',
    marginBottom: SIZING.spacing.lg,
  },
  initiateText: {
    color: '#4717F6',
    fontSize: SIZING.font.body,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  activeSlot: {
    opacity: 1,
  },
  circleSlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 77, 51, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeText: {
    color: COLORS.text.secondary,
    fontSize: SIZING.font.small,
    marginTop: 2,
  },
  countText: {
    color: '#4717F6',
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginTop: 2,
  },
}); 