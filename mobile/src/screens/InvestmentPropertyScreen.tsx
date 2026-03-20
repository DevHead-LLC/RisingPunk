import React, { useRef, useEffect, memo, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Text, Modal, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { FloorPlan } from '../components/common/FloorPlan';
import {
  useGetRentalHousingStatusQuery,
  useStartRemodelMutation,
  useSpeedupRemodelMutation,
  useGetCrewStatusQuery,
  useGetCrewDetailsQuery,
  useRequestCrewBackupMutation,
} from '../store/api/authApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { balanceApi } from '../store/api/balanceApi';
import { rentalHousingApi } from '../store/api/rentalHousingApi';
import { updateBalance } from '../store/slices/balanceSlice';
import type { RemodelRoomType } from '../store/api/authApi';
import { usePanGesture } from '../hooks/usePanGesture';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

let GestureDetector: any, Animated: any, useAnimatedStyle: any;

const gestureHandler = require('react-native-gesture-handler');
const reanimated = require('react-native-reanimated');

GestureDetector = gestureHandler.GestureDetector;
Animated = reanimated.default;
useAnimatedStyle = reanimated.useAnimatedStyle;

interface InvestmentPropertyScreenProps {
  propertyId: number;
  onBack: () => void;
}

/** Human-readable label for remodel room type (e.g. livingRoom → "Living Room"). */
function getRemodelRoomDisplayName(room: RemodelRoomType): string {
  const labels: Record<RemodelRoomType, string> = {
    bathroom: 'Bathroom',
    kitchen: 'Kitchen',
    bedroom: 'Bedroom',
    livingRoom: 'Living Room',
    garage: 'Garage',
  };
  return labels[room] ?? room;
}

const GesturePanView = memo(function GesturePanView({
  children,
  offsetX,
  offsetY,
  panGesture,
  contentStyle,
}: {
  children: React.ReactNode;
  offsetX: any;
  offsetY: any;
  panGesture: any;
  contentStyle?: any;
}) {
  const animatedStyle: any = useAnimatedStyle(() => {
    'worklet';
    const transform = [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
    ];
    
    return {
      transform,
    };
  }, [offsetX, offsetY]);

  const style = contentStyle ?? styles.scrollContent;

  if (!panGesture) {
    return (
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

export const InvestmentPropertyScreen: React.FC<InvestmentPropertyScreenProps> = ({
  propertyId,
  onBack
}) => {
  const colors = useThemeColors();
  const { themeMode } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [remodelRoom, setRemodelRoom] = useState<RemodelRoomType | null>(null);
  const [modalCountdownNow, setModalCountdownNow] = useState(() => Date.now());
  const [hasActiveRemodelHere, setHasActiveRemodelHere] = useState(false);
  const [activeTab, setActiveTab] = useState<'mainFloor' | 'garage'>('mainFloor');
  /** True when we've seen status.isBuilding so we keep polling until build completes (avoids using status in its own query options). */
  const [pollForBuilding, setPollForBuilding] = useState(false);

  const { data: status, refetch: refetchRentalStatus } = useGetRentalHousingStatusQuery(propertyId, {
    pollingInterval: remodelRoom || hasActiveRemodelHere || pollForBuilding ? 5000 : 0
  });

  useEffect(() => {
    if (status?.isBuilding) setPollForBuilding(true);
    else if (status !== undefined) setPollForBuilding(false);
  }, [status?.isBuilding, status]);
  const { data: crewStatus } = useGetCrewStatusQuery();
  const hasActiveRemodelThisProperty = status?.activeRemodel?.propertyId === propertyId;
  const isPropertyBuilding = status?.isBuilding ?? false;
  const { data: crewDetails, refetch: refetchCrewDetails } = useGetCrewDetailsQuery(crewStatus?.crewId ?? '', {
    skip: !crewStatus?.crewId || !crewStatus?.isInCrew,
    pollingInterval: hasActiveRemodelThisProperty || isPropertyBuilding ? 3000 : 0,
  });
  const currentUserId = useAppSelector((state) => state.auth.user?._id ?? (state.auth.user as any)?.id);
  const backupRequests = crewDetails?.crew?.backupRequests ?? [];
  const mine = (pred: (r: { userId?: string; jobType?: string; jobLabel?: string; jobKey?: string }) => boolean) =>
    Boolean(currentUserId && backupRequests.some((r) => String(r.userId) === String(currentUserId) && pred(r)));
  const rentalBuildJobKey = `property${propertyId}`;
  const hasRequestedBackupForBuild = mine(
    (r) =>
      (r.jobType === 'rentalBuild' || (r.jobLabel?.includes('Investment property') ?? false)) &&
      r.jobKey === rentalBuildJobKey
  );
  const hasRequestedBackupForRemodel = mine(
    (r) => r.jobType === 'remodel' || (r.jobLabel?.toLowerCase().includes('remodel') ?? false)
  );
  const [requestCrewBackup] = useRequestCrewBackupMutation();

  const hadActiveRemodelRef = useRef(false);
  const hadActiveBuildRef = useRef(false);
  useEffect(() => {
    const hasActiveRemodel = Boolean(hasActiveRemodelThisProperty && crewStatus?.crewId && crewStatus?.isInCrew);
    if (hasActiveRemodel && !hadActiveRemodelRef.current) {
      hadActiveRemodelRef.current = true;
      refetchCrewDetails();
    }
    if (!hasActiveRemodelThisProperty) hadActiveRemodelRef.current = false;
  }, [hasActiveRemodelThisProperty, crewStatus?.crewId, crewStatus?.isInCrew, refetchCrewDetails]);
  useEffect(() => {
    const hasActiveBuild = Boolean(isPropertyBuilding && crewStatus?.crewId && crewStatus?.isInCrew);
    if (hasActiveBuild && !hadActiveBuildRef.current) {
      hadActiveBuildRef.current = true;
      refetchCrewDetails();
    }
    if (!isPropertyBuilding) hadActiveBuildRef.current = false;
  }, [isPropertyBuilding, crewStatus?.crewId, crewStatus?.isInCrew, refetchCrewDetails]);

  useEffect(() => {
    setHasActiveRemodelHere(status?.activeRemodel?.propertyId === propertyId);
  }, [status?.activeRemodel?.propertyId, propertyId]);

  const [startRemodel] = useStartRemodelMutation();
  const [speedupRemodel] = useSpeedupRemodelMutation();
  const dispatch = useAppDispatch();
  const balanceState = useAppSelector(state => state.balance);
  const propertyLevel = status?.propertyLevel ?? 0;
  const roomLevels = status?.roomLevels ?? { bathroom: 1, kitchen: 1, bedroom: 1, livingRoom: 1, garage: 1 };
  const activeRemodel = status?.activeRemodel?.propertyId === propertyId ? status.activeRemodel : null;
  const activeRemodelRoom = activeRemodel?.room ?? null;
  const showGarageTab = propertyLevel >= 7;
  const maxRoomLevel = status?.maxRoomLevel;
  const maxGarageRoomLevel = status?.maxGarageRoomLevel;
  const roomRemodelLevels = status?.roomRemodelLevels;
  const hasRemodelConfig = Boolean(maxRoomLevel != null && roomRemodelLevels?.length);

  const isModalShowingInProgress = Boolean(remodelRoom && activeRemodel?.room === remodelRoom && activeRemodel?.completesAt);
  const remainingSec = activeRemodel?.completesAt
    ? Math.max(0, (new Date(activeRemodel.completesAt).getTime() - modalCountdownNow) / 1000)
    : 0;
  const timeUp = remainingSec <= 0;
  const closeRemodelModal = useCallback(() => {
    setRemodelRoom(null);
    refetchRentalStatus();
    dispatch(balanceApi.util.invalidateTags(['Balance']));
    dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
    refetchCrewDetails();
  }, [dispatch, refetchRentalStatus, refetchCrewDetails]);
  // Bugbot: Refetch triggers server-side remodel auto-complete (GET rental-housing-status auto-completes when timer has ended); no explicit complete-remodel call needed.
  // When timer hits zero while modal is open, close the modal so we don't jump to "Start new Remodel" after refetch clears activeRemodel (Bugbot).
  useEffect(() => {
    if (timeUp && isModalShowingInProgress) closeRemodelModal();
  }, [timeUp, isModalShowingInProgress, closeRemodelModal]);
  useEffect(() => {
    if (!isModalShowingInProgress) return;
    setModalCountdownNow(Date.now());
    const id = setInterval(() => setModalCountdownNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isModalShowingInProgress, remodelRoom, activeRemodel?.room, activeRemodel?.completesAt]);

  const propertyBuildCompletesAt = status?.buildStatus?.completesAt ?? null;
  const [propertyBuildCountdownNow, setPropertyBuildCountdownNow] = useState(() => Date.now());
  const propertyBuildRemainingSec = propertyBuildCompletesAt
    ? Math.max(0, (new Date(propertyBuildCompletesAt).getTime() - propertyBuildCountdownNow) / 1000)
    : 0;
  useEffect(() => {
    if (!isPropertyBuilding || !propertyBuildCompletesAt) return;
    setPropertyBuildCountdownNow(Date.now());
    const id = setInterval(() => setPropertyBuildCountdownNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isPropertyBuilding, propertyBuildCompletesAt]);
  useEffect(() => {
    if (isPropertyBuilding && propertyBuildRemainingSec <= 0) {
      refetchRentalStatus();
      dispatch(balanceApi.util.invalidateTags(['Balance']));
      dispatch(rentalHousingApi.util.invalidateTags(['RentalHousingIncome']));
    }
  }, [isPropertyBuilding, propertyBuildRemainingSec, refetchRentalStatus, dispatch]);

  const FLOOR_PLAN_WIDTH = 1250;
  const FLOOR_PLAN_HEIGHT = 950;
  const { offsetX, offsetY, panGesture, centerView } = usePanGesture(FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT, {
    centerVertically: false,
  });

  useEffect(() => {
    setTimeout(() => {
      centerView();
    }, 100);
  }, [propertyId, centerView]);

  const GARAGE_WIDTH = 1200;
  const GARAGE_HEIGHT = 900;
  const {
    offsetX: garageOffsetX,
    offsetY: garageOffsetY,
    panGesture: garagePanGesture,
    centerView: centerGarage,
  } = usePanGesture(GARAGE_WIDTH, GARAGE_HEIGHT, { centerVertically: true });

  useEffect(() => {
    if (activeTab === 'garage') {
      setTimeout(centerGarage, 100);
    }
  }, [activeTab, centerGarage]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onBack} />
      
      {/* Fixed Property pill at top center (same position as HomeScreen fixedHomePill) */}
      <View style={[styles.fixedPropertyPillWrapper, { zIndex: 1000 }]}>
        <View style={[styles.fixedPropertyPill, { backgroundColor: colors.primary }]}>
          <Text style={styles.fixedPropertyText}>
            {showGarageTab ? (activeTab === 'mainFloor' ? 'Main Floor' : 'Garage') : `Property ${propertyId}`}
          </Text>
        </View>
      </View>

      {/* Property build/upgrade in progress: timer + Request back-up */}
      {isPropertyBuilding && propertyBuildRemainingSec > 0 && (
        <View style={[styles.propertyBuildBanner, { backgroundColor: colors.primary + '22', borderColor: colors.matrix }]}>
          <Text style={[styles.propertyBuildBannerText, { color: colors.text?.primary ?? '#fff' }]}>
            {propertyLevel === 0 ? 'Property build' : 'Property upgrade'} in progress — Time left:{' '}
            {Math.floor(propertyBuildRemainingSec / 60)}:{(Math.floor(propertyBuildRemainingSec) % 60).toString().padStart(2, '0')}
          </Text>
          {crewStatus?.isInCrew && crewDetails != null && !hasRequestedBackupForBuild && (
            <TouchableOpacity
              style={[styles.propertyBuildBackupButton, { backgroundColor: colors.primary, borderColor: colors.matrix }]}
              onPress={() => {
                requestCrewBackup({ jobType: 'rentalBuild', jobKey: `property${propertyId}` });
              }}
            >
              <Text style={[styles.propertyBuildBackupButtonText, { color: colors.background ?? '#fff' }]}>Request back-up</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.scrollView}>
        {(!showGarageTab || activeTab === 'mainFloor') ? (
          <GesturePanView 
            offsetX={offsetX}
            offsetY={offsetY}
            panGesture={panGesture}
          >
            <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }]}>
              <FloorPlan
                propertyId={propertyId}
                propertyLevel={propertyLevel}
                onRemodel={propertyLevel >= 3 && hasRemodelConfig ? setRemodelRoom : undefined}
                onCloseRemodel={closeRemodelModal}
                activeRemodelRoom={activeRemodelRoom}
                activeRemodelCompletesAt={activeRemodel?.completesAt ?? null}
                showRequestBackup={Boolean(crewStatus?.isInCrew && crewDetails != null && !hasRequestedBackupForRemodel)}
                onRequestBackup={() => {
                  requestCrewBackup({ jobType: 'remodel' });
                }}
                showGarage={false}
                maxRoomLevel={maxRoomLevel}
                roomRemodelLevels={roomRemodelLevels}
              />
            </View>
          </GesturePanView>
        ) : (
          <GesturePanView
            offsetX={garageOffsetX}
            offsetY={garageOffsetY}
            panGesture={garagePanGesture}
            contentStyle={styles.garageScrollContent}
          >
            <View style={[styles.garageContainer, { borderColor: colors.matrix }]}>
              <FloorPlan
                propertyId={propertyId}
                propertyLevel={propertyLevel}
                onRemodel={propertyLevel >= 7 && hasRemodelConfig ? setRemodelRoom : undefined}
                onCloseRemodel={closeRemodelModal}
                activeRemodelRoom={activeRemodelRoom}
                activeRemodelCompletesAt={activeRemodel?.completesAt ?? null}
                showRequestBackup={Boolean(crewStatus?.isInCrew && crewDetails != null && !hasRequestedBackupForRemodel)}
                onRequestBackup={() => {
                  requestCrewBackup({ jobType: 'remodel' });
                }}
                showGarage={true}
                maxRoomLevel={maxRoomLevel}
                maxGarageRoomLevel={maxGarageRoomLevel}
                roomRemodelLevels={roomRemodelLevels}
              />
            </View>
          </GesturePanView>
        )}
      </View>

      {/* Tab navigation at bottom (same position and styling as HomeScreen) */}
      {showGarageTab && (
        <View style={[styles.tabContainer, { zIndex: 1000 }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab !== 'mainFloor' && themeMode === 'light' && styles.tabButtonInactiveLight,
              activeTab === 'mainFloor' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('mainFloor')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab !== 'mainFloor' && themeMode === 'light' && styles.tabTextInactiveLight,
              activeTab === 'mainFloor' && styles.tabTextActive,
            ]}>Main Floor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab !== 'garage' && themeMode === 'light' && styles.tabButtonInactiveLight,
              activeTab === 'garage' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('garage')}
          >
            <Text style={[
              styles.tabButtonText,
              activeTab !== 'garage' && themeMode === 'light' && styles.tabTextInactiveLight,
              activeTab === 'garage' && styles.tabTextActive,
            ]}>Garage</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Remodel modal — Android: explicit overlay dimensions so modal centers (see taskItems/android/turf/investment-property-remodel-modal-android.md) */}
      {remodelRoom && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setRemodelRoom(null)}
          statusBarTranslucent
          hardwareAccelerated
          supportedOrientations={['landscape-left', 'landscape-right']}
          presentationStyle="overFullScreen"
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: 'rgba(0,0,0,0.6)' },
              Platform.OS === 'android' && {
                position: 'absolute',
                top: 0,
                left: 0,
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
              },
            ]}
            pointerEvents="box-none"
          >
            <View
              style={[
                styles.modalBox,
                {
                  backgroundColor: colors.background,
                  borderWidth: 2,
                  borderColor: colors.matrix ?? colors.text?.secondary ?? '#888',
                },
              ]}
              pointerEvents="auto"
            >
              <Text style={[styles.modalTitle, { color: colors.text?.primary || '#fff' }]}>
                Remodel {getRemodelRoomDisplayName(remodelRoom)}
              </Text>
              {activeRemodel?.room === remodelRoom ? (
                (() => {
                  const remainingSec = activeRemodel.completesAt
                    ? Math.max(0, (new Date(activeRemodel.completesAt).getTime() - modalCountdownNow) / 1000)
                    : 0;
                  const speedupCost = Math.ceil(remainingSec) * 5;
                  const canSpeedup = (balanceState.total ?? 0) >= speedupCost && remainingSec > 0;
                  const timeUp = remainingSec <= 0;
                  return (
                    <>
                      <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                        {timeUp ? 'Remodel complete! (Completion is automatic.)' : `Remodel in progress. Time left: ${Math.floor(remainingSec / 60)}:${(Math.floor(remainingSec) % 60).toString().padStart(2, '0')}`}
                      </Text>
                      {!timeUp && crewStatus?.isInCrew && crewDetails != null && !hasRequestedBackupForRemodel && (
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                          onPress={() => {
                            requestCrewBackup({ jobType: 'remodel' });
                          }}
                        >
                          <Text style={styles.modalButtonText}>Request back-up</Text>
                        </TouchableOpacity>
                      )}
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        {timeUp ? (
                          <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={closeRemodelModal}
                            onPressOut={() => {
                              if (Platform.OS === 'android') closeRemodelModal();
                            }}
                          >
                            <Text style={styles.modalButtonText}>Close</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.modalButton, { backgroundColor: canSpeedup ? colors.primary : '#666' }]}
                              onPress={async () => {
                                if (!canSpeedup) return;
                                try {
                                  const res = await speedupRemodel({ propertyId, room: remodelRoom }).unwrap();
                                  dispatch(updateBalance({
                                    total: res.newBalance,
                                    ratePerSecond: res.ratePerSecond ?? balanceState.ratePerSecond,
                                    lastUpdated: balanceState.lastUpdated ? new Date(balanceState.lastUpdated) : null,
                                    fractionalRemainder: balanceState.fractionalRemainder
                                  }));
                                  setRemodelRoom(null);
                                  refetchRentalStatus();
                                  refetchCrewDetails();
                                } catch {
                                  // keep modal open
                                }
                              }}
                              onPressOut={() => {
                                if (Platform.OS === 'android' && canSpeedup) {
                                  (async () => {
                                    try {
                                      const res = await speedupRemodel({ propertyId, room: remodelRoom }).unwrap();
                                      dispatch(updateBalance({
                                        total: res.newBalance,
                                        ratePerSecond: res.ratePerSecond ?? balanceState.ratePerSecond,
                                        lastUpdated: balanceState.lastUpdated ? new Date(balanceState.lastUpdated) : null,
                                        fractionalRemainder: balanceState.fractionalRemainder
                                      }));
                                      setRemodelRoom(null);
                                      refetchRentalStatus();
                                      refetchCrewDetails();
                                    } catch {
                                      // keep modal open
                                    }
                                  })();
                                }
                              }}
                              disabled={!canSpeedup}
                            >
                              <Text style={styles.modalButtonText}>Speedup (${speedupCost})</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.modalButton, { backgroundColor: '#444' }]}
                              onPress={() => setRemodelRoom(null)}
                              onPressOut={() => {
                                if (Platform.OS === 'android') setRemodelRoom(null);
                              }}
                            >
                              <Text style={styles.modalButtonText}>Close</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </>
                  );
                })()
              ) : (
                (() => {
                  const currentLevel = roomLevels[remodelRoom] ?? 1;
                  const effectiveMaxLevel = remodelRoom === 'garage' && maxGarageRoomLevel != null ? maxGarageRoomLevel : maxRoomLevel;
                  if (!hasRemodelConfig || effectiveMaxLevel == null) {
                    return (
                      <>
                        <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                          Loading remodel options…
                        </Text>
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: colors.primary }]}
                          onPress={() => setRemodelRoom(null)}
                          onPressOut={() => {
                            if (Platform.OS === 'android') setRemodelRoom(null);
                          }}
                        >
                          <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  }
                  if (currentLevel >= effectiveMaxLevel) {
                    return (
                      <>
                        <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                          This room is already at max level ({effectiveMaxLevel}).
                        </Text>
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: colors.primary }]}
                          onPress={() => setRemodelRoom(null)}
                          onPressOut={() => {
                            if (Platform.OS === 'android') setRemodelRoom(null);
                          }}
                        >
                          <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  }
                  const nextLevel = Math.min(effectiveMaxLevel, currentLevel + 1);
                  const tier = roomRemodelLevels!.find((r) => r.roomLevel === nextLevel);
                  const minProp = remodelRoom === 'garage' && nextLevel >= 2 && nextLevel <= 4
                    ? (nextLevel === 2 ? 7 : nextLevel === 3 ? 8 : 9)
                    : tier?.minPropertyLevel;
                  if (!tier || minProp == null || propertyLevel < minProp) {
                    return (
                      <>
                        <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                          Property level too low for next remodel (need level {minProp ?? '?'}).
                        </Text>
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: colors.primary }]}
                          onPress={() => setRemodelRoom(null)}
                          onPressOut={() => {
                            if (Platform.OS === 'android') setRemodelRoom(null);
                          }}
                        >
                          <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  }
                  const hasFunds = (balanceState.total ?? 0) >= tier.cost;
                  return (
                    <>
                      <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                        Level {currentLevel} → {nextLevel}: ${tier.cost.toLocaleString()}, {tier.constructionTimeMinutes} min
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: hasFunds ? colors.primary : '#666' }]}
                          onPress={async () => {
                            if (!hasFunds) return;
                            try {
                              const res = await startRemodel({ propertyId, room: remodelRoom }).unwrap();
                              if (res.newBalance != null) {
                                dispatch(updateBalance({
                                  total: res.newBalance,
                                  ratePerSecond: balanceState.ratePerSecond,
                                  lastUpdated: balanceState.lastUpdated ? new Date(balanceState.lastUpdated) : null,
                                  fractionalRemainder: balanceState.fractionalRemainder
                                }));
                              }
                              refetchRentalStatus();
                              setRemodelRoom(null);
                            } catch (err: any) {
                              const msg = err?.data?.message || err?.data?.error;
                              if (msg && typeof msg === 'string') {
                                Alert.alert('Can\'t Start Remodel', msg);
                              }
                            }
                          }}
                          onPressOut={() => {
                            if (Platform.OS === 'android' && hasFunds) {
                              (async () => {
                                try {
                                  const res = await startRemodel({ propertyId, room: remodelRoom }).unwrap();
                                  if (res.newBalance != null) {
                                    dispatch(updateBalance({
                                      total: res.newBalance,
                                      ratePerSecond: balanceState.ratePerSecond,
                                      lastUpdated: balanceState.lastUpdated ? new Date(balanceState.lastUpdated) : null,
                                      fractionalRemainder: balanceState.fractionalRemainder
                                    }));
                                  }
                                  refetchRentalStatus();
                                  setRemodelRoom(null);
                                } catch {
                                  // keep modal open
                                }
                              })();
                            }
                          }}
                          disabled={!hasFunds}
                        >
                          <Text style={styles.modalButtonText}>Start Remodel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalButton, { backgroundColor: '#444' }]}
                          onPress={() => setRemodelRoom(null)}
                          onPressOut={() => {
                            if (Platform.OS === 'android') setRemodelRoom(null);
                          }}
                        >
                          <Text style={styles.modalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: 1250,
    height: 950,
    position: 'relative',
  },
  garageScrollContent: {
    width: 1200,
    height: 900,
    position: 'relative',
  },
  floorPlanContainer: {
    padding: SIZING.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 950,
    minWidth: 1250,
  },
  fixedPropertyPillWrapper: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  fixedPropertyPill: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 80,
  },
  tabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: SIZING.spacing.md,
    paddingBottom: SIZING.spacing.lg,
    gap: SIZING.spacing.sm,
  },
  tabButton: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  tabButtonInactiveLight: {
    backgroundColor: '#9E9E9E',
    borderColor: '#757575',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(71,23,246,0.15)',
    borderColor: 'rgba(71,23,246,0.5)',
  },
  tabButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  tabTextInactiveLight: {
    color: '#212121',
  },
  tabTextActive: {
    color: '#b39ddb',
  },
  garageContainer: {
    width: 1200,
    height: 900,
    padding: SIZING.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  fixedPropertyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  propertyBuildBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderBottomWidth: 1,
    marginHorizontal: SIZING.spacing.md,
    marginTop: 4,
    borderRadius: 8,
  },
  propertyBuildBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  propertyBuildBackupButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  propertyBuildBackupButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    padding: SIZING.spacing.lg,
    borderRadius: 12,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
