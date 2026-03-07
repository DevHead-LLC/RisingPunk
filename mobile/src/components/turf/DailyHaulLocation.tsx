import React, { memo, useMemo, useState, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  useWindowDimensions,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useGetDailyHaulStatusQuery, useClaimDailyHaulMutation } from '../../store/api/dailyHaulApi';
import { CloseButton } from '../common/CloseButton';

const PROFILE_HEIGHT = 60;
const PROFILE_WIDTH = 60;
/** Extra space below the profile so it has margin above the Daily Haul icon. */
const GAP_BELOW_PROFILE = 16;

/** Slightly larger than top-center icons so the Daily Haul is easy to see and tap. */
const BUTTON_SIZE = 48;
/** Offset so the icon is centered under the profile (profile is PROFILE_WIDTH wide). */
const CENTER_OFFSET = (PROFILE_WIDTH - BUTTON_SIZE) / 2;

/** Reward display per day (matches server dailyHaulConfig). fixed = single prize; else variable (random) range. */
const REWARD_DISPLAY: { day: number; range: string; fixed?: boolean }[] = [
  { day: 1, range: '$10,000 – $50,000' },
  { day: 2, range: '$50,000 – $100,000' },
  { day: 3, range: '$100,000 – $200,000' },
  { day: 4, range: '$200,000 – $300,000' },
  { day: 5, range: '$300,000 – $400,000' },
  { day: 6, range: '$600,000', fixed: true },
  { day: 7, range: '$750,000', fixed: true },
];

function getResetsInText(resetsAt: string): string {
  const end = new Date(resetsAt).getTime();
  const now = Date.now();
  const ms = Math.max(0, end - now);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `Resets in ${days}d ${hours}h`;
  if (hours > 0) return `Resets in ${hours}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return mins > 0 ? `Resets in ${mins}m` : 'Resets soon';
}

/** Day cell: box with green check for claimed, red X for missed; optional highlight border for claimable. */
function DayCell({
  day,
  isClaimed,
  isMarkedOff,
  isClaimable,
  onClaim,
  colors,
  isClaiming,
}: {
  day: number;
  isClaimed: boolean;
  isMarkedOff: boolean;
  isClaimable: boolean;
  onClaim: () => void;
  colors: ReturnType<typeof useThemeColors>;
  isClaiming: boolean;
}) {
  const borderColor = isClaimable ? (colors.matrix ?? colors.success ?? colors.primary) : colors.primary;
  const content = (
    <View style={[styles.dayBox, { borderColor }, isClaimable && styles.dayBoxClaimable]}>
      <Text style={[styles.dayBoxLabel, { color: colors.text?.secondary ?? colors.primary }]}>
        Day {day}
      </Text>
      {isClaimed && (
        <View style={styles.dayOverlay} pointerEvents="none">
          <Text style={[styles.checkmark, { color: colors.success ?? colors.matrix }]}>✓</Text>
        </View>
      )}
      {isMarkedOff && (
        <View style={styles.dayOverlay} pointerEvents="none">
          <Text style={[styles.markedOffX, { color: colors.error }]}>✗</Text>
        </View>
      )}
    </View>
  );

  if (isClaimable) {
    return (
      <TouchableOpacity
        onPress={onClaim}
        disabled={isClaiming}
        activeOpacity={0.7}
        accessible
        accessibilityLabel={`Claim Day ${day}`}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export const DailyHaulLocation = memo(function DailyHaulLocation() {
  const colors = useThemeColors();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const [showModal, setShowModal] = useState(false);
  const [resetsTick, setResetsTick] = useState(0);
  const { data: status, refetch } = useGetDailyHaulStatusQuery(undefined, {
    pollingInterval: 60000,
  });
  const [claim, { isLoading: isClaiming }] = useClaimDailyHaulMutation();

  const handleClaim = async () => {
    if (!status?.canClaim || isClaiming) return;
    try {
      await claim().unwrap();
      refetch();
    } catch (_) {
      // Error surfaced by API
    }
  };

  useEffect(() => {
    if (!status?.resetsAt) return;
    const interval = setInterval(() => setResetsTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [status?.resetsAt]);

  const resetsIn = useMemo(() => {
    if (!status?.resetsAt) return '';
    return getResetsInText(status.resetsAt);
  }, [status?.resetsAt, resetsTick]);

  const claimedSet = useMemo(
    () => new Set(status?.claimedDays ?? []),
    [status?.claimedDays]
  );
  const markedOffSet = useMemo(
    () => new Set(status?.markedOffDays ?? []),
    [status?.markedOffDays]
  );
  const nextClaimDay = status?.nextClaimDay ?? null;
  const canClaim = status?.canClaim ?? false;

  const dayToAmount = useMemo(() => {
    const claimed = status?.claimedDays ?? [];
    const amounts = status?.awardedAmounts ?? [];
    const map: Record<number, number> = {};
    claimed.forEach((day, i) => {
      if (amounts[i] != null) map[day] = amounts[i];
    });
    return map;
  }, [status?.claimedDays, status?.awardedAmounts]);

  const modalWidth = winWidth * 0.7;
  const modalHeight = winHeight * 0.8;

  return (
    <>
      <View style={[styles.container, styles.position]}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
          accessible
          accessibilityLabel="Daily Haul. Tap to open."
          accessibilityHint="Opens daily reward"
        >
          <Image
            source={require('../../assets/images/ui/dailyHaul.png')}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
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
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowModal(false)}
          />
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
              alwaysBounceVertical={true}
            >
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Daily Haul</Text>
              {status?.resetsAt ? (
                <Text style={[styles.resetsIn, { color: colors.neutral }]}>{resetsIn}</Text>
              ) : null}

              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <View style={styles.daysCol}>
                    <Text style={[styles.tableHeaderText, { color: colors.primary }]}>Days</Text>
                  </View>
                  <View style={styles.rewardCol}>
                    <Text style={[styles.tableHeaderText, { color: colors.primary }]}>Haul</Text>
                  </View>
                  <View style={styles.wonCol}>
                    <Text style={[styles.tableHeaderText, { color: colors.primary }]}>Pulled</Text>
                  </View>
                </View>
                {REWARD_DISPLAY.map(({ day, range, fixed }) => (
                  <View key={day} style={[styles.tableRow, styles.tableDataRow, { borderColor: colors.primary }]}>
                    <View style={styles.daysCol}>
                      {isClaiming && nextClaimDay === day ? (
                        <View style={[styles.dayBox, styles.dayBoxClaimable, { borderColor: colors.matrix ?? colors.primary }]}>
                          <ActivityIndicator size="small" color={colors.matrix ?? colors.primary} />
                        </View>
                      ) : (
                        <DayCell
                          day={day}
                          isClaimed={claimedSet.has(day)}
                          isMarkedOff={markedOffSet.has(day)}
                          isClaimable={nextClaimDay === day && canClaim}
                          onClaim={handleClaim}
                          colors={colors}
                          isClaiming={isClaiming}
                        />
                      )}
                    </View>
                    <View style={[styles.rewardCol, styles.rewardCell]}>
                      <Text
                        style={[styles.rewardCellText, { color: colors.text?.secondary ?? colors.primary }]}
                        numberOfLines={2}
                      >
                        {fixed ? `Prize: ${range}` : `Variable: ${range}`}
                      </Text>
                    </View>
                    <View style={[styles.wonCol, styles.wonCell]}>
                      <Text
                        style={[styles.rewardCellText, { color: colors.matrix ?? colors.text?.secondary ?? colors.primary }]}
                        numberOfLines={1}
                      >
                        {dayToAmount[day] != null ? `$${Number(dayToAmount[day]).toLocaleString()}` : '—'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
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
    right: SIZING.spacing.lg + CENTER_OFFSET,
    alignItems: 'center',
    zIndex: 3,
  },
  position: {
    top: SIZING.spacing.lg + PROFILE_HEIGHT + GAP_BELOW_PROFILE,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
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
  resetsIn: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.sm,
  },
  table: {
    width: '100%',
    marginBottom: SIZING.spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  tableHeaderRow: {
    marginBottom: SIZING.spacing.xs,
  },
  tableHeaderText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  tableDataRow: {
    borderTopWidth: 1,
    paddingVertical: SIZING.spacing.xs,
  },
  daysCol: {
    width: 72,
    minWidth: 72,
    marginRight: SIZING.spacing.md,
  },
  rewardCol: {
    flex: 1,
    minWidth: 0,
    marginRight: SIZING.spacing.sm,
  },
  rewardCell: {
    justifyContent: 'center',
  },
  wonCol: {
    minWidth: 88,
    width: 88,
  },
  wonCell: {
    justifyContent: 'center',
  },
  rewardCellText: {
    fontSize: SIZING.font.small,
  },
  dayBox: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    position: 'relative',
  },
  dayBoxClaimable: {
    borderWidth: 2,
  },
  dayBoxLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
  },
  dayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '700',
  },
  markedOffX: {
    fontSize: 20,
    fontWeight: '700',
  },
});
