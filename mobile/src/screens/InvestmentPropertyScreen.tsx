import React, { useRef, useEffect, useMemo, useCallback, memo, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text, Platform, Modal, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { FloorPlan } from '../components/common/FloorPlan';
import {
  useGetRentalHousingStatusQuery,
  useStartRemodelMutation,
  useCompleteRemodelMutation,
  useSpeedupRemodelMutation,
} from '../store/api/authApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateBalance } from '../store/slices/balanceSlice';
import type { RemodelRoomType } from '../store/api/authApi';
import { MAX_ROOM_LEVEL, minPropertyLevelForNextRoomLevel } from '../utils/rentalPropertyConfig';

/**
 * Remodel tier cost/time. Matches server construction_config rental_property roomRemodelLevels (levels 2–8, +5 min per level).
 */
const ROOM_REMODEL_CONFIG: { level: number; cost: number; timeMinutes: number }[] = [
  { level: 2, cost: 5000, timeMinutes: 5 },
  { level: 3, cost: 10000, timeMinutes: 10 },
  { level: 4, cost: 15000, timeMinutes: 15 },
  { level: 5, cost: 20000, timeMinutes: 20 },
  { level: 6, cost: 25000, timeMinutes: 25 },
  { level: 7, cost: 30000, timeMinutes: 30 },
  { level: 8, cost: 35000, timeMinutes: 35 },
];

let Gesture: any, GestureDetector: any, Animated: any, useSharedValue: any, useAnimatedStyle: any, withDecay: any, computePanBounds: any;

const gestureHandler = require('react-native-gesture-handler');
const reanimated = require('react-native-reanimated');
const mapPanBounds = require('../utils/mapPanBounds');

Gesture = gestureHandler.Gesture;
GestureDetector = gestureHandler.GestureDetector;
Animated = reanimated.default;
useSharedValue = reanimated.useSharedValue;
useAnimatedStyle = reanimated.useAnimatedStyle;
withDecay = reanimated.withDecay;
computePanBounds = mapPanBounds.computePanBounds;

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
}: {
  children: React.ReactNode;
  offsetX: any;
  offsetY: any;
  panGesture: any;
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

  if (!panGesture) {
    return (
      <Animated.View style={[styles.scrollContent, animatedStyle]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.scrollContent, animatedStyle]}>
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

  const { data: status } = useGetRentalHousingStatusQuery(propertyId, {
    pollingInterval: remodelRoom || hasActiveRemodelHere ? 5000 : 0
  });

  useEffect(() => {
    setHasActiveRemodelHere(status?.activeRemodel?.propertyId === propertyId);
  }, [status?.activeRemodel?.propertyId, propertyId]);

  const [startRemodel] = useStartRemodelMutation();
  const [completeRemodel] = useCompleteRemodelMutation();
  const [speedupRemodel] = useSpeedupRemodelMutation();
  const dispatch = useAppDispatch();
  const balanceState = useAppSelector(state => state.balance);
  const propertyLevel = status?.propertyLevel ?? 0;
  const roomLevels = status?.roomLevels ?? { bathroom: 1, kitchen: 1, bedroom: 1, livingRoom: 1, garage: 1 };
  const activeRemodel = status?.activeRemodel?.propertyId === propertyId ? status.activeRemodel : null;
  const activeRemodelRoom = activeRemodel?.room ?? null;
  const showGarageTab = propertyLevel >= 7;

  const isModalShowingInProgress = Boolean(remodelRoom && activeRemodel?.room === remodelRoom && activeRemodel?.completesAt);
  useEffect(() => {
    if (!isModalShowingInProgress) return;
    setModalCountdownNow(Date.now());
    const id = setInterval(() => setModalCountdownNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isModalShowingInProgress, remodelRoom, activeRemodel?.room, activeRemodel?.completesAt]);

  const FLOOR_PLAN_WIDTH = 1250;
  const FLOOR_PLAN_HEIGHT = 950;

  const offsetX: any = useSharedValue(0);
  const offsetY: any = useSharedValue(0);
  const startX: any = useSharedValue(0);
  const startY: any = useSharedValue(0);
  
  const minX: any = useSharedValue(-1000000);
  const maxX: any = useSharedValue(1000000);
  const minY: any = useSharedValue(-1000000);
  const maxY: any = useSharedValue(1000000);
  const boundsReady: any = useSharedValue(false);

  const centerView = useCallback(() => {
    const screenWidth = Dimensions.get('window').width;
    const CENTER_X = (FLOOR_PLAN_WIDTH - screenWidth) / 2;
    
    let x = -CENTER_X;
    let y = 0;
    
    if (boundsReady.value) {
      x = Math.min(maxX.value, Math.max(minX.value, x));
      y = Math.min(maxY.value, Math.max(minY.value, y));
    }
    
    offsetX.value = x;
    offsetY.value = y;
  }, [offsetX, offsetY, FLOOR_PLAN_WIDTH, boundsReady, minX, maxX, minY, maxY]);

  useEffect(() => {
    if (computePanBounds) {
      const WINDOW_WIDTH = Dimensions.get('window').width;
      const WINDOW_HEIGHT = Dimensions.get('window').height;
      const MARGIN_SIZE = 0;
      
      let ADJUSTED_WIDTH = WINDOW_WIDTH;
      let ADJUSTED_HEIGHT = WINDOW_HEIGHT;

      if (Platform.OS === 'android') {
        const SCREEN_WIDTH = Dimensions.get('screen').width;
        ADJUSTED_WIDTH = SCREEN_WIDTH;
      }

      const boundsX = computePanBounds({
        totalSize: FLOOR_PLAN_WIDTH,
        containerWidth: ADJUSTED_WIDTH,
        containerHeight: ADJUSTED_HEIGHT,
        marginSize: MARGIN_SIZE,
      });

      const boundsY = computePanBounds({
        totalSize: FLOOR_PLAN_HEIGHT,
        containerWidth: ADJUSTED_WIDTH,
        containerHeight: ADJUSTED_HEIGHT,
        marginSize: MARGIN_SIZE,
      });

      let adjustedBounds;
      if (Platform.OS === 'android') {
        const ANDROID_NAVIGATION_BAR_HEIGHT = 24;
        const ANDROID_HEADER_HEIGHT = ANDROID_NAVIGATION_BAR_HEIGHT;
        
        adjustedBounds = {
          minX: boundsX.minX,
          maxX: boundsX.maxX,
          minY: boundsY.minY - ANDROID_HEADER_HEIGHT,
          maxY: boundsY.maxY
        };
      } else {
        adjustedBounds = {
          minX: boundsX.minX,
          maxX: boundsX.maxX,
          minY: boundsY.minY,
          maxY: boundsY.maxY
        };
      }

      minX.value = adjustedBounds.minX;
      maxX.value = adjustedBounds.maxX;
      minY.value = adjustedBounds.minY;
      maxY.value = adjustedBounds.maxY;
      boundsReady.value = true;
    }
  }, [minX, maxX, minY, maxY, boundsReady, computePanBounds, FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT]);

  const panGesture = useMemo(() => {
    if (Gesture && computePanBounds) {
      return Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .onStart(() => {
          'worklet';
          startX.value = offsetX.value;
          startY.value = offsetY.value;
        })
        .onUpdate((g: any) => {
          'worklet';
          let x = startX.value + g.translationX;
          let y = startY.value + g.translationY;
          
          if (boundsReady.value) {
            x = Math.min(maxX.value, Math.max(minX.value, x));
            y = Math.min(maxY.value, Math.max(minY.value, y));
          }
          
          offsetX.value = x;
          offsetY.value = y;
        })
        .onEnd((g: any) => {
          'worklet';
          if (boundsReady.value) {
            offsetX.value = withDecay({ 
              velocity: g.velocityX, 
              deceleration: 0.99,
              clamp: [minX.value, maxX.value]
            });
            offsetY.value = withDecay({ 
              velocity: g.velocityY, 
              deceleration: 0.99,
              clamp: [minY.value, maxY.value]
            });
          }
        });
    }
    return null;
  }, [offsetX, offsetY, startX, startY, boundsReady, minX, maxX, minY, maxY, withDecay, computePanBounds]);

  useEffect(() => {
    setTimeout(() => {
      centerView();
    }, 100);
  }, [propertyId, centerView]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onBack} />
      
      {/* Fixed Property pill at top center; show Main Floor | Garage when level >= 7 */}
      <View style={[styles.fixedPropertyPill, { backgroundColor: colors.primary }]}>
        <Text style={styles.fixedPropertyText}>
          {showGarageTab ? (activeTab === 'mainFloor' ? 'Main Floor' : 'Garage') : `Property ${propertyId}`}
        </Text>
      </View>
      
      {showGarageTab && (
        <View style={[styles.tabRow, { borderColor: colors.matrix }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'mainFloor' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('mainFloor')}
          >
            <Text style={[styles.tabButtonText, { color: activeTab === 'mainFloor' ? '#fff' : colors.text?.secondary ?? '#999' }]}>Main Floor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'garage' && { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('garage')}
          >
            <Text style={[styles.tabButtonText, { color: activeTab === 'garage' ? '#fff' : colors.text?.secondary ?? '#999' }]}>Garage</Text>
          </TouchableOpacity>
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
                onRemodel={propertyLevel >= 3 ? setRemodelRoom : undefined}
                activeRemodelRoom={activeRemodelRoom}
                activeRemodelCompletesAt={activeRemodel?.completesAt ?? null}
                showGarage={false}
              />
            </View>
          </GesturePanView>
        ) : (
          <View style={[styles.garageContainer, { borderColor: colors.matrix }]}>
            <FloorPlan
              propertyId={propertyId}
              propertyLevel={propertyLevel}
              onRemodel={propertyLevel >= 7 ? setRemodelRoom : undefined}
              activeRemodelRoom={activeRemodelRoom}
              activeRemodelCompletesAt={activeRemodel?.completesAt ?? null}
              showGarage={true}
            />
          </View>
        )}
      </View>

      {/* Remodel modal */}
      {remodelRoom && (
        <Modal visible transparent animationType="fade" supportedOrientations={['landscape-left', 'landscape-right']}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[styles.modalBox, { backgroundColor: colors.background }]}>
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
                        {timeUp ? 'Remodel complete! Tap Complete to finish.' : `Remodel in progress. Time left: ${Math.floor(remainingSec / 60)}:${(Math.floor(remainingSec) % 60).toString().padStart(2, '0')}`}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                        {timeUp ? (
                          <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={async () => {
                              try {
                                const res = await completeRemodel({ propertyId, room: remodelRoom }).unwrap();
                                if (res.ratePerSecond != null || res.newBalance != null) {
                                  dispatch(updateBalance({
                                    total: res.newBalance ?? balanceState.total ?? 0,
                                    ratePerSecond: res.ratePerSecond ?? balanceState.ratePerSecond,
                                    lastUpdated: balanceState.lastUpdated ? new Date(balanceState.lastUpdated) : null,
                                    fractionalRemainder: balanceState.fractionalRemainder
                                  }));
                                }
                                setRemodelRoom(null);
                              } catch {
                                // keep modal open
                              }
                            }}
                          >
                            <Text style={styles.modalButtonText}>Complete</Text>
                          </TouchableOpacity>
                        ) : (
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
                              } catch {
                                // keep modal open
                              }
                            }}
                            disabled={!canSpeedup}
                          >
                            <Text style={styles.modalButtonText}>Speedup (${speedupCost})</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#444' }]} onPress={() => setRemodelRoom(null)}>
                          <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()
              ) : (
                (() => {
                  const currentLevel = roomLevels[remodelRoom] ?? 1;
                  if (currentLevel >= MAX_ROOM_LEVEL) {
                    return (
                      <>
                        <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                          This room is already at max level ({MAX_ROOM_LEVEL}).
                        </Text>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={() => setRemodelRoom(null)}>
                          <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  }
                  const nextLevel = Math.min(MAX_ROOM_LEVEL, currentLevel + 1);
                  const config = ROOM_REMODEL_CONFIG[nextLevel - 2];
                  const minProp = minPropertyLevelForNextRoomLevel(nextLevel);
                  if (!config || propertyLevel < minProp) {
                    return (
                      <>
                        <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                          Property level too low for next remodel (need level {minProp}).
                        </Text>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={() => setRemodelRoom(null)}>
                          <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  }
                  if (remodelRoom === 'garage' && propertyLevel < 7) {
                    return (
                      <>
                        <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                          Property must be level 7 or higher to remodel garage.
                        </Text>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={() => setRemodelRoom(null)}>
                          <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                      </>
                    );
                  }
                  const hasFunds = (balanceState.total ?? 0) >= config.cost;
                  return (
                    <>
                      <Text style={[styles.modalSubtitle, { color: colors.text?.secondary || '#ccc' }]}>
                        Level {currentLevel} → {nextLevel}: ${config.cost.toLocaleString()}, {config.timeMinutes} min
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
                              setRemodelRoom(null);
                            } catch {
                              // keep modal open
                            }
                          }}
                          disabled={!hasFunds}
                        >
                          <Text style={styles.modalButtonText}>Start Remodel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#444' }]} onPress={() => setRemodelRoom(null)}>
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
  fixedPropertyPill: {
    position: 'absolute',
    top: 15,
    left: '50%',
    transform: [{ translateX: -70 }],
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 140,
    zIndex: 1000,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 999,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  garageContainer: {
    padding: SIZING.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  fixedPropertyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
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
