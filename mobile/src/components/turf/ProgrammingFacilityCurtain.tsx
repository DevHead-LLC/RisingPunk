import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { useUnlockProgrammingFacilityMutation } from '../../store/api/authApi';
import { SIZING } from '../../styles/theme';

/** Covers the upper-right turf area with matrix-style imagery. Levels 1–19: lock + "Locked". Level 20: blue "$1,000,000" to unlock. */
const PROGRAMMING_FACILITY_UNLOCK_COST = 1_000_000;

/** Curtain size — covers facility area and upper right. */
const CURTAIN_WIDTH = 480;
const CURTAIN_HEIGHT = 380;
/** Tile dimensions so 2×2 grid exactly fills the curtain (no gap on right). */
const MATRIX_TILE_WIDTH = CURTAIN_WIDTH / 2;
const MATRIX_TILE_HEIGHT = CURTAIN_HEIGHT / 2;

type ProgrammingFacilityCurtainProps = {
  /** When true, show price and allow unlock (level 20+). When false, show lock only (levels 1–19). */
  showUnlockPrice: boolean;
};

export const ProgrammingFacilityCurtain = memo(function ProgrammingFacilityCurtain({
  showUnlockPrice,
}: ProgrammingFacilityCurtainProps) {
  const balanceTotal = useAppSelector(getCurrentBalance);
  const [unlock, { isLoading, isError, error }] = useUnlockProgrammingFacilityMutation();

  const canAfford = balanceTotal >= PROGRAMMING_FACILITY_UNLOCK_COST;
  const handleUnlock = () => {
    if (!showUnlockPrice || !canAfford || isLoading) return;
    unlock();
  };

  const unlockErrorMessage =
    isError && error
      ? (error as { status?: number; data?: { error?: string } }).status === 402 ||
        (error as { data?: { error?: string } }).data?.error === 'Insufficient funds'
        ? 'Insufficient funds.'
        : 'Unlock failed. Try again.'
      : null;

  return (
    <View style={[styles.curtain, { backgroundColor: '#0a0f0a' }]}>
      {/* Tiled matrix image (green 0s and 1s) — no background so dark curtain shows through */}
      <View style={styles.matrixTiles}>
        <Image source={require('../../assets/images/turfScreen/matrixStyle01.png')} style={styles.matrixTile} resizeMode="cover" />
        <Image source={require('../../assets/images/turfScreen/matrixStyle01.png')} style={styles.matrixTile} resizeMode="cover" />
        <Image source={require('../../assets/images/turfScreen/matrixStyle01.png')} style={styles.matrixTile} resizeMode="cover" />
        <Image source={require('../../assets/images/turfScreen/matrixStyle01.png')} style={styles.matrixTile} resizeMode="cover" />
      </View>
      {/* Overlay so lock/price text is readable */}
      <View style={[styles.textOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
      {/* Center content: lock (1–19) or price (20) */}
      <View style={styles.centerContent} pointerEvents="box-none">
        {showUnlockPrice ? (
          <>
            <TouchableOpacity
              style={styles.priceTouchable}
              onPress={handleUnlock}
              disabled={!canAfford || isLoading}
              activeOpacity={0.8}
              accessible
              accessibilityLabel={`Unlock Programming Facility for $${PROGRAMMING_FACILITY_UNLOCK_COST.toLocaleString()}. ${canAfford ? 'Tap to unlock.' : 'Insufficient funds.'}`}
              accessibilityRole="button"
            >
              <View style={[styles.priceBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#60A5FA" />
                ) : (
                  <>
                    <Text style={[styles.priceText, { color: '#60A5FA' }]}>
                      ${PROGRAMMING_FACILITY_UNLOCK_COST.toLocaleString()}
                    </Text>
                    <Text style={[styles.priceSubtext, { color: '#60A5FA' }]}>
                      Tap to unlock
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
            {unlockErrorMessage ? (
              <Text style={styles.unlockError}>{unlockErrorMessage}</Text>
            ) : null}
          </>
        ) : (
          <View style={[styles.lockBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.lockEmoji}>🔒</Text>
            <Text style={[styles.lockText, { color: '#60A5FA' }]}>
              Locked
            </Text>
            <Text style={[styles.lockSubtext, { color: '#60A5FA' }]}>
              Reach level 20
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  curtain: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: CURTAIN_WIDTH,
    height: CURTAIN_HEIGHT,
    zIndex: 3,
    overflow: 'hidden',
  },
  matrixTiles: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  matrixTile: {
    width: MATRIX_TILE_WIDTH,
    height: MATRIX_TILE_HEIGHT,
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  lockEmoji: {
    fontSize: 32,
    marginBottom: SIZING.spacing.xs,
  },
  lockText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  lockSubtext: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  priceTouchable: {
    alignItems: 'center',
  },
  priceBadge: {
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  priceText: {
    fontSize: SIZING.font.large,
    fontWeight: '700',
  },
  priceSubtext: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  unlockError: {
    marginTop: SIZING.spacing.sm,
    fontSize: SIZING.font.small,
    color: '#f87171',
    textAlign: 'center',
  },
});
