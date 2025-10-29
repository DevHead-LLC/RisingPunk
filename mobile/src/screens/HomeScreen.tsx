import React, {memo, useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {View, StyleSheet, ScrollView, Dimensions, Text, TouchableOpacity, Platform} from 'react-native';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { HackRigDisplay } from '../components/home/HackRigDisplay';
import { BotAssembly } from '../components/home/BotAssembly';
import { HomeFloorPlan } from '../components/home/HomeFloorPlan';
import { useThemeColors } from '../hooks/useThemeColors';

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

type TabType = 'floorPlan' | 'garage';

type HomeScreenProps = {
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToBotAssembly: () => void;
  onNavigateToBattle: () => void;
};

const GesturePanView = memo(function GesturePanView({
  children,
  offsetX,
  offsetY,
  panGesture,
  style,
}: {
  children: React.ReactNode;
  offsetX: any;
  offsetY: any;
  panGesture: any;
  style: any;
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

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

export const HomeScreen = memo(function HomeScreen({
  onClose,
  onNavigateToMap,
  onNavigateToBotAssembly,
  onNavigateToBattle,
}: HomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<TabType>('floorPlan');
  const scrollViewRef = useRef<ScrollView>(null);
  const garageScrollViewRef = useRef<ScrollView>(null);

  const FLOOR_PLAN_WIDTH = 1250;
  const FLOOR_PLAN_HEIGHT = 950;
  const GARAGE_WIDTH = 1200;
  const GARAGE_HEIGHT = 900;

  const floorPlanOffsetX: any = useSharedValue(0);
  const floorPlanOffsetY: any = useSharedValue(0);
  const floorPlanStartX: any = useSharedValue(0);
  const floorPlanStartY: any = useSharedValue(0);
  
  const floorPlanMinX: any = useSharedValue(-1000000);
  const floorPlanMaxX: any = useSharedValue(1000000);
  const floorPlanMinY: any = useSharedValue(-1000000);
  const floorPlanMaxY: any = useSharedValue(1000000);
  const floorPlanBoundsReady: any = useSharedValue(false);

  const garageOffsetX: any = useSharedValue(0);
  const garageOffsetY: any = useSharedValue(0);
  const garageStartX: any = useSharedValue(0);
  const garageStartY: any = useSharedValue(0);
  
  const garageMinX: any = useSharedValue(-1000000);
  const garageMaxX: any = useSharedValue(1000000);
  const garageMinY: any = useSharedValue(-1000000);
  const garageMaxY: any = useSharedValue(1000000);
  const garageBoundsReady: any = useSharedValue(false);

  const centerFloorPlanAndroid = useCallback(() => {
    if (Platform.OS === 'android') {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const CENTER_X = (FLOOR_PLAN_WIDTH - SCREEN_WIDTH) / 2;
      
      floorPlanOffsetX.value = -CENTER_X;
      floorPlanOffsetY.value = 0;
    }
  }, [floorPlanOffsetX, floorPlanOffsetY, FLOOR_PLAN_WIDTH]);

  const centerGarageAndroid = useCallback(() => {
    if (Platform.OS === 'android') {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const SCREEN_HEIGHT = Dimensions.get('window').height;
      const CENTER_X = (GARAGE_WIDTH - SCREEN_WIDTH) / 2;
      const CENTER_Y = (GARAGE_HEIGHT - SCREEN_HEIGHT) / 2;
      
      garageOffsetX.value = -CENTER_X;
      garageOffsetY.value = -CENTER_Y;
    }
  }, [garageOffsetX, garageOffsetY, GARAGE_WIDTH, GARAGE_HEIGHT]);

  useEffect(() => {
    if (Platform.OS === 'android' && computePanBounds) {
      const WINDOW_WIDTH = Dimensions.get('window').width;
      const WINDOW_HEIGHT = Dimensions.get('window').height;
      const SCREEN_WIDTH = Dimensions.get('screen').width;
      const MARGIN_SIZE = 0;
      
      const ADJUSTED_WIDTH = SCREEN_WIDTH;
      const ADJUSTED_HEIGHT = WINDOW_HEIGHT;

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

      const ANDROID_NAVIGATION_BAR_HEIGHT = 24;
      const ANDROID_HEADER_HEIGHT = ANDROID_NAVIGATION_BAR_HEIGHT;
      
      const adjustedBounds = {
        minX: boundsX.minX,
        maxX: boundsX.maxX,
        minY: boundsY.minY - ANDROID_HEADER_HEIGHT,
        maxY: boundsY.maxY
      };

      floorPlanMinX.value = adjustedBounds.minX;
      floorPlanMaxX.value = adjustedBounds.maxX;
      floorPlanMinY.value = adjustedBounds.minY;
      floorPlanMaxY.value = adjustedBounds.maxY;
      floorPlanBoundsReady.value = true;
    }
  }, [floorPlanMinX, floorPlanMaxX, floorPlanMinY, floorPlanMaxY, floorPlanBoundsReady, computePanBounds, FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT]);

  useEffect(() => {
    if (Platform.OS === 'android' && computePanBounds) {
      const WINDOW_WIDTH = Dimensions.get('window').width;
      const WINDOW_HEIGHT = Dimensions.get('window').height;
      const SCREEN_WIDTH = Dimensions.get('screen').width;
      const MARGIN_SIZE = 0;
      
      const ADJUSTED_WIDTH = SCREEN_WIDTH;
      const ADJUSTED_HEIGHT = WINDOW_HEIGHT;

      const boundsX = computePanBounds({
        totalSize: GARAGE_WIDTH,
        containerWidth: ADJUSTED_WIDTH,
        containerHeight: ADJUSTED_HEIGHT,
        marginSize: MARGIN_SIZE,
      });

      const boundsY = computePanBounds({
        totalSize: GARAGE_HEIGHT,
        containerWidth: ADJUSTED_WIDTH,
        containerHeight: ADJUSTED_HEIGHT,
        marginSize: MARGIN_SIZE,
      });

      const ANDROID_NAVIGATION_BAR_HEIGHT = 24;
      const ANDROID_HEADER_HEIGHT = ANDROID_NAVIGATION_BAR_HEIGHT;
      
      const adjustedBounds = {
        minX: boundsX.minX,
        maxX: boundsX.maxX,
        minY: boundsY.minY - ANDROID_HEADER_HEIGHT,
        maxY: boundsY.maxY
      };

      garageMinX.value = adjustedBounds.minX;
      garageMaxX.value = adjustedBounds.maxX;
      garageMinY.value = adjustedBounds.minY;
      garageMaxY.value = adjustedBounds.maxY;
      garageBoundsReady.value = true;
    }
  }, [garageMinX, garageMaxX, garageMinY, garageMaxY, garageBoundsReady, computePanBounds, GARAGE_WIDTH, GARAGE_HEIGHT]);

  const floorPlanPanGesture = useMemo(() => {
    if (Platform.OS === 'android') {
      return Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .onStart(() => {
          'worklet';
          floorPlanStartX.value = floorPlanOffsetX.value;
          floorPlanStartY.value = floorPlanOffsetY.value;
        })
        .onUpdate((g: any) => {
          'worklet';
          let x = floorPlanStartX.value + g.translationX;
          let y = floorPlanStartY.value + g.translationY;
          
          if (floorPlanBoundsReady.value) {
            x = Math.min(floorPlanMaxX.value, Math.max(floorPlanMinX.value, x));
            y = Math.min(floorPlanMaxY.value, Math.max(floorPlanMinY.value, y));
          }
          
          floorPlanOffsetX.value = x;
          floorPlanOffsetY.value = y;
        })
        .onEnd((g: any) => {
          'worklet';
          if (floorPlanBoundsReady.value) {
            floorPlanOffsetX.value = withDecay({ 
              velocity: g.velocityX, 
              deceleration: 0.99,
              clamp: [floorPlanMinX.value, floorPlanMaxX.value]
            });
            floorPlanOffsetY.value = withDecay({ 
              velocity: g.velocityY, 
              deceleration: 0.99,
              clamp: [floorPlanMinY.value, floorPlanMaxY.value]
            });
          }
        });
    }
    return null;
  }, [floorPlanOffsetX, floorPlanOffsetY, floorPlanStartX, floorPlanStartY, floorPlanBoundsReady, floorPlanMinX, floorPlanMaxX, floorPlanMinY, floorPlanMaxY, withDecay]);

  const garagePanGesture = useMemo(() => {
    if (Platform.OS === 'android') {
      return Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .onStart(() => {
          'worklet';
          garageStartX.value = garageOffsetX.value;
          garageStartY.value = garageOffsetY.value;
        })
        .onUpdate((g: any) => {
          'worklet';
          let x = garageStartX.value + g.translationX;
          let y = garageStartY.value + g.translationY;
          
          if (garageBoundsReady.value) {
            x = Math.min(garageMaxX.value, Math.max(garageMinX.value, x));
            y = Math.min(garageMaxY.value, Math.max(garageMinY.value, y));
          }
          
          garageOffsetX.value = x;
          garageOffsetY.value = y;
        })
        .onEnd((g: any) => {
          'worklet';
          if (garageBoundsReady.value) {
            garageOffsetX.value = withDecay({ 
              velocity: g.velocityX, 
              deceleration: 0.99,
              clamp: [garageMinX.value, garageMaxX.value]
            });
            garageOffsetY.value = withDecay({ 
              velocity: g.velocityY, 
              deceleration: 0.99,
              clamp: [garageMinY.value, garageMaxY.value]
            });
          }
        });
    }
    return null;
  }, [garageOffsetX, garageOffsetY, garageStartX, garageStartY, garageBoundsReady, garageMinX, garageMaxX, garageMinY, garageMaxY, withDecay]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      setTimeout(() => {
        centerFloorPlanAndroid();
      }, 100);
    } else {
      const screenWidth = Dimensions.get('window').width;
      const centerX = (FLOOR_PLAN_WIDTH - screenWidth) / 2;
      const centerY = 0;
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: centerX,
          y: centerY,
          animated: false,
        });
      }, 100);
    }
  }, [centerFloorPlanAndroid, FLOOR_PLAN_WIDTH]);

  useEffect(() => {
    if (activeTab === 'garage') {
      if (Platform.OS === 'android') {
        setTimeout(() => {
          centerGarageAndroid();
        }, 100);
      } else {
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;
        const centerX = (GARAGE_WIDTH - screenWidth) / 2;
        const centerY = (GARAGE_HEIGHT - screenHeight) / 2;
        
        setTimeout(() => {
          garageScrollViewRef.current?.scrollTo({
            x: centerX,
            y: centerY,
            animated: false,
          });
        }, 100);
      }
    }
  }, [activeTab, centerGarageAndroid, GARAGE_WIDTH, GARAGE_HEIGHT]);

  const renderFloorPlan = () => {
    if (Platform.OS === 'ios') {
      return (
        <ScrollView
          ref={scrollViewRef}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
          directionalLockEnabled={false}
          alwaysBounceHorizontal={true}
          alwaysBounceVertical={true}
        >
          <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }]}>
            <HomeFloorPlan
              onHackRigPress={onNavigateToMap}
              onNavigateToBattle={onNavigateToBattle}
            />
            <View style={styles.hackRigContainer}>
              <HackRigDisplay
                onPress={onNavigateToMap}
                onNavigateToBattle={onNavigateToBattle}
              />
            </View>
          </View>
        </ScrollView>
      );
    } else {
      return (
        <View style={styles.scrollView}>
          <GesturePanView 
            offsetX={floorPlanOffsetX}
            offsetY={floorPlanOffsetY}
            panGesture={floorPlanPanGesture}
            style={styles.scrollContent}
          >
            <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }]}>
              <HomeFloorPlan
                onHackRigPress={onNavigateToMap}
                onNavigateToBattle={onNavigateToBattle}
              />
              <View style={styles.hackRigContainer}>
                <HackRigDisplay
                  onPress={onNavigateToMap}
                  onNavigateToBattle={onNavigateToBattle}
                />
              </View>
            </View>
          </GesturePanView>
        </View>
      );
    }
  };

  const renderGarage = () => {
    if (Platform.OS === 'ios') {
      return (
        <ScrollView
          ref={garageScrollViewRef}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.garageScrollContent}
          style={styles.scrollView}
          directionalLockEnabled={false}
          alwaysBounceHorizontal={true}
          alwaysBounceVertical={true}
        >
          <View style={[styles.garageContainer, { borderColor: colors.matrix }]}>
            <View style={styles.botAssemblyContainer}>
              <BotAssembly onPress={onNavigateToBotAssembly} />
            </View>
          </View>
        </ScrollView>
      );
    } else {
      return (
        <View style={styles.scrollView}>
          <GesturePanView 
            offsetX={garageOffsetX}
            offsetY={garageOffsetY}
            panGesture={garagePanGesture}
            style={styles.garageScrollContent}
          >
            <View style={[styles.garageContainer, { borderColor: colors.matrix }]}>
              <View style={styles.botAssemblyContainer}>
                <BotAssembly onPress={onNavigateToBotAssembly} />
              </View>
            </View>
          </GesturePanView>
        </View>
      );
    }
  };

  const TabButton = ({ label, tab, isActive }: { label: string; tab: TabType; isActive: boolean }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onClose} />
      
      {/* Fixed pill at top center of screen */}
      <View style={styles.fixedHomePillWrapper}>
        <View style={[styles.fixedHomePill, { backgroundColor: '#2E7D32' }]}>
          <Text style={styles.fixedHomeText}>{activeTab === 'floorPlan' ? 'Main Floor' : 'Garage'}</Text>
        </View>
      </View>
      
      {/* Content based on active tab */}
      {activeTab === 'floorPlan' ? renderFloorPlan() : renderGarage()}
      
      {/* Tab Navigation - Fixed at bottom */}
      <View style={styles.tabContainer}>
        <TabButton label="Main Floor" tab="floorPlan" isActive={activeTab === 'floorPlan'} />
        <TabButton label="Garage" tab="garage" isActive={activeTab === 'garage'} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHomePillWrapper: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  fixedHomePill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
  },
  fixedHomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
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
  tabButtonActive: {
    backgroundColor: 'rgba(71,23,246,0.15)',
    borderColor: 'rgba(71,23,246,0.5)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#b39ddb',
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
    position: 'relative',
  },
  hackRigContainer: {
    position: 'absolute',
    top: 235,
    left: 820,
    width: 500,
    height: 375,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -250 }, { translateY: -187.5 }],
  },
  garageContainer: {
    width: 1200,
    height: 900,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    alignSelf: 'center',
  },

  botAssemblyContainer: {
    width: 500,
    height: 375,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
