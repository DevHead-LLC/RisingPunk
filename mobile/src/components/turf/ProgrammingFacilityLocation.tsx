import React, { memo, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  useWindowDimensions,
  Pressable,
  ScrollView,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppSelector } from '../../store/hooks';
import { CloseButton } from '../common/CloseButton';

/** Same size as Home and Digital Barracks: 120×120 container, 100×100 icon. */
const CONTAINER_SIZE = 120;
const ICON_SIZE = 100;

type ProgrammingFacilityLocationProps = {
  onSelectPacketBreach: () => void;
  onSelectRaceConditionHeist: () => void;
  onSelectBinaryBankCrack: () => void;
};

export const ProgrammingFacilityLocation = memo(function ProgrammingFacilityLocation({
  onSelectPacketBreach,
  onSelectRaceConditionHeist,
  onSelectBinaryBankCrack,
}: ProgrammingFacilityLocationProps) {
  const colors = useThemeColors();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const userLevel = useAppSelector((state) => state.auth.user?.level ?? 0);
  const programmingFacilityUnlocked = useAppSelector((state) => state.auth.user?.unlockedFeatures?.programmingFacility === true);
  const [showModal, setShowModal] = useState(false);

  if (userLevel < 20 || !programmingFacilityUnlocked) return null;

  const handleOpenPacketBreach = () => {
    setShowModal(false);
    onSelectPacketBreach();
  };

  const handleOpenRaceConditionHeist = () => {
    setShowModal(false);
    onSelectRaceConditionHeist();
  };

  const handleOpenBinaryBankCrack = () => {
    setShowModal(false);
    onSelectBinaryBankCrack();
  };

  const modalWidth = winWidth * 0.5;
  const modalHeight = winHeight * 0.5;

  return (
    <>
      <View style={[styles.container, styles.gridPosition]}>
        <View
          pointerEvents="none"
          style={[
            styles.digitalTurfPatch,
            { backgroundColor: colors.matrix + '0D', borderColor: colors.primary + '55' },
          ]}
        />
        <TouchableOpacity
          style={[styles.button, { borderColor: colors.primary }]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
          accessible
          accessibilityLabel="Programming Facility. Tap to open."
          accessibilityRole="button"
        >
          <Image
            source={require('../../assets/images/programBotChallenges/botProgrammingBuilding.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={[styles.locationLabel, { color: colors.secondary }]}>PROGRAMMING FACILITY</Text>
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
        statusBarTranslucent
        supportedOrientations={['landscape-left', 'landscape-right']}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowModal(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                borderColor: colors.primary,
                width: modalWidth,
                maxWidth: modalWidth,
                height: modalHeight,
                maxHeight: modalHeight,
              },
            ]}
          >
            <CloseButton onPress={() => setShowModal(false)} />
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              <Text style={[styles.modalTitle, { color: colors.primary }]}>
                Programming Facility
              </Text>
              <Text style={[styles.subtitle, { color: colors.text?.secondary ?? colors.primary }]}>
                Program your bots. Select a game.
              </Text>

              <TouchableOpacity
                style={[styles.gameOption, { borderColor: colors.primary }]}
                onPress={handleOpenPacketBreach}
                activeOpacity={0.7}
                accessible
                accessibilityLabel="Packet Breach. Tap to play."
                accessibilityRole="button"
              >
                <Text style={[styles.gameOptionTitle, { color: colors.primary }]}>Packet Breach</Text>
                <Text style={[styles.gameOptionDesc, { color: colors.text?.secondary ?? colors.primary }]}>
                  Brute · Breach the node
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gameOption, { borderColor: colors.primary }]}
                onPress={handleOpenRaceConditionHeist}
                activeOpacity={0.7}
                accessible
                accessibilityLabel="Race Condition Heist. Tap to play."
                accessibilityRole="button"
              >
                <Text style={[styles.gameOptionTitle, { color: colors.primary }]}>Race Condition Heist</Text>
                <Text style={[styles.gameOptionDesc, { color: colors.text?.secondary ?? colors.primary }]}>
                  Sprint · Hijack the packet
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gameOption, { borderColor: colors.primary }]}
                onPress={handleOpenBinaryBankCrack}
                activeOpacity={0.7}
                accessible
                accessibilityLabel="Binary Bank Crack. Tap to play."
                accessibilityRole="button"
              >
                <Text style={[styles.gameOptionTitle, { color: colors.primary }]}>Binary Bank Crack</Text>
                <Text style={[styles.gameOptionDesc, { color: colors.text?.secondary ?? colors.primary }]}>
                  Remote · Phreaks
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 3,
  },
  /** Upper-mid left area of the turf grid (2000x2000 scroll content) — down and left from top-right. */
  gridPosition: {
    top: 150,
    right: 200,
  },
  button: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.xs,
  },
  digitalTurfPatch: {
    position: 'absolute',
    top: -12,
    width: 190,
    height: 150,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: -1,
  },
  iconImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  locationLabel: {
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
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalScroll: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  modalScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  modalTitle: {
    fontSize: SIZING.font.large,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  subtitle: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
  },
  gameOption: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
  },
  gameOptionTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  gameOptionDesc: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
});
