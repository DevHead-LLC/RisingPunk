import React, {memo, useRef, useEffect, useState, useMemo, useCallback} from 'react';
import {View, StyleSheet, ScrollView, Dimensions, Text, TouchableOpacity, Platform, Animated as RNAnimated} from 'react-native';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { HackRigDisplay } from '../components/home/HackRigDisplay';
import { BotAssembly } from '../components/home/BotAssembly';
import { HomeFloorPlan } from '../components/home/HomeFloorPlan';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTrackHomeVisitMutation } from '../store/api/userGuideApi';
import { useTaskGuideHighlight } from '../contexts/TaskGuideHighlightContext';
import { useAppSelector } from '../store/hooks';
import { TaskGuideHighlightOverlay } from '../components/turf/TaskGuideHighlightOverlay';

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

type HomeScreenProps = {
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToBotAssembly: () => void;
  onNavigateToBattle: () => void;
};

function GesturePanView({
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
}

type TabType = 'floorPlan' | 'garage';

const TabButton = memo(({ 
  label, 
  tab, 
  isActive, 
  isHighlighted,
  colors,
  onPress,
  advanceHighlightStep
}: { 
  label: string; 
  tab: TabType; 
  isActive: boolean;
  isHighlighted: boolean;
  colors: any;
  onPress: (tab: TabType) => void;
  advanceHighlightStep: () => void;
}) => {
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const animatedBorderColor = useState(new RNAnimated.Value(0))[0];
  
  const introColors = [colors.primary, colors.secondary, colors.matrix];
  
  useEffect(() => {
    if (isHighlighted) {
      const interval = setInterval(() => {
        setCurrentColorIndex(prev => (prev + 1) % introColors.length);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isHighlighted, introColors.length]);
  
  useEffect(() => {
    if (isHighlighted) {
      RNAnimated.timing(animatedBorderColor, {
        toValue: currentColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentColorIndex, isHighlighted, animatedBorderColor]);
  
  const animatedBorderColorValue = animatedBorderColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: introColors,
  });
  
  const handlePress = () => {
    onPress(tab);
    if (isHighlighted) {
      advanceHighlightStep();
    }
  };
  
  return (
    <View style={{ zIndex: isHighlighted ? 1000 : 3 }}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.tabButton, 
          isActive && styles.tabButtonActive, 
          isHighlighted && { 
            borderWidth: 3, 
            borderColor: undefined,
            overflow: 'hidden',
          }
        ]}
      >
        {isHighlighted && (
          <RNAnimated.View 
            style={[
              StyleSheet.absoluteFill,
              {
                borderWidth: 3,
                borderColor: animatedBorderColorValue,
                borderRadius: 6,
              }
            ]} 
            pointerEvents="none"
          />
        )}
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
});

export const HomeScreen = memo(function HomeScreen({
  onClose,
  onNavigateToMap,
  onNavigateToBotAssembly,
  onNavigateToBattle,
}: HomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const token = useAppSelector((state) => state.auth.token);
  const [activeTab, setActiveTab] = useState<TabType>('floorPlan');
  const scrollViewRef = useRef<ScrollView>(null);
  const garageScrollViewRef = useRef<ScrollView>(null);
  const [trackHomeVisit] = useTrackHomeVisitMutation();
  const { highlightTaskId, highlightStep, clearHighlight, advanceHighlightStep } = useTaskGuideHighlight();
  const hasTrackedVisit = useRef(false);
  
  const isBuildGuardians = highlightTaskId === 'build-100-guardians';
  const isGarageTabHighlight = isBuildGuardians && highlightStep === 'garage-tab';
  const isBotAssemblyHighlight = isBuildGuardians && highlightStep === 'bot-assembly';

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

  const centerFloorPlan = useCallback(() => {
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CENTER_X = (FLOOR_PLAN_WIDTH - SCREEN_WIDTH) / 2;
    
    let x = -CENTER_X;
    let y = 0;
    
    if (floorPlanBoundsReady.value) {
      x = Math.min(floorPlanMaxX.value, Math.max(floorPlanMinX.value, x));
      y = Math.min(floorPlanMaxY.value, Math.max(floorPlanMinY.value, y));
    }
    
    floorPlanOffsetX.value = x;
    floorPlanOffsetY.value = y;
  }, [floorPlanOffsetX, floorPlanOffsetY, FLOOR_PLAN_WIDTH, floorPlanBoundsReady, floorPlanMinX, floorPlanMaxX, floorPlanMinY, floorPlanMaxY]);

  const centerGarage = useCallback(() => {
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const SCREEN_HEIGHT = Dimensions.get('window').height;
    const CENTER_X = (GARAGE_WIDTH - SCREEN_WIDTH) / 2;
    const CENTER_Y = (GARAGE_HEIGHT - SCREEN_HEIGHT) / 2;
    
    let x = -CENTER_X;
    let y = -CENTER_Y;
    
    if (garageBoundsReady.value) {
      x = Math.min(garageMaxX.value, Math.max(garageMinX.value, x));
      y = Math.min(garageMaxY.value, Math.max(garageMinY.value, y));
    }
    
    garageOffsetX.value = x;
    garageOffsetY.value = y;
  }, [garageOffsetX, garageOffsetY, GARAGE_WIDTH, GARAGE_HEIGHT, garageBoundsReady, garageMinX, garageMaxX, garageMinY, garageMaxY]);

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

      floorPlanMinX.value = adjustedBounds.minX;
      floorPlanMaxX.value = adjustedBounds.maxX;
      floorPlanMinY.value = adjustedBounds.minY;
      floorPlanMaxY.value = adjustedBounds.maxY;
      floorPlanBoundsReady.value = true;
    }
  }, [floorPlanMinX, floorPlanMaxX, floorPlanMinY, floorPlanMaxY, floorPlanBoundsReady, computePanBounds, FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT]);

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

      garageMinX.value = adjustedBounds.minX;
      garageMaxX.value = adjustedBounds.maxX;
      garageMinY.value = adjustedBounds.minY;
      garageMaxY.value = adjustedBounds.maxY;
      garageBoundsReady.value = true;
    }
  }, [garageMinX, garageMaxX, garageMinY, garageMaxY, garageBoundsReady, computePanBounds, GARAGE_WIDTH, GARAGE_HEIGHT]);

  const floorPlanPanGesture = useMemo(() => {
    if (!Gesture) {
      return null;
    }
    return Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .enabled(!isGarageTabHighlight && !isBotAssemblyHighlight)
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
  }, [floorPlanOffsetX, floorPlanOffsetY, floorPlanStartX, floorPlanStartY, floorPlanBoundsReady, floorPlanMinX, floorPlanMaxX, floorPlanMinY, floorPlanMaxY, withDecay, isGarageTabHighlight, isBotAssemblyHighlight]);

  const garagePanGesture = useMemo(() => {
    if (!Gesture) {
      return null;
    }
    return Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .enabled(!isGarageTabHighlight && !isBotAssemblyHighlight)
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
  }, [garageOffsetX, garageOffsetY, garageStartX, garageStartY, garageBoundsReady, garageMinX, garageMaxX, garageMinY, garageMaxY, withDecay, isGarageTabHighlight, isBotAssemblyHighlight]);

  useEffect(() => {
    if (activeTab === 'garage') {
      garageStartX.value = garageOffsetX.value;
      garageStartY.value = garageOffsetY.value;
      setTimeout(() => {
        centerGarage();
        garageStartX.value = garageOffsetX.value;
        garageStartY.value = garageOffsetY.value;
      }, 100);
    } else if (activeTab === 'floorPlan') {
      floorPlanStartX.value = floorPlanOffsetX.value;
      floorPlanStartY.value = floorPlanOffsetY.value;
      setTimeout(() => {
        centerFloorPlan();
        floorPlanStartX.value = floorPlanOffsetX.value;
        floorPlanStartY.value = floorPlanOffsetY.value;
      }, 100);
    }
  }, [activeTab, centerGarage, centerFloorPlan, floorPlanStartX, floorPlanStartY, floorPlanOffsetX, floorPlanOffsetY, garageStartX, garageStartY, garageOffsetX, garageOffsetY]);

  useEffect(() => {
    if (token && !hasTrackedVisit.current) {
      hasTrackedVisit.current = true;
      trackHomeVisit().then(() => {
        if (highlightTaskId === 'visit-home') {
          clearHighlight();
        }
      }).catch(() => {
        if (highlightTaskId === 'visit-home') {
          clearHighlight();
        }
      });
    }
  }, [token, highlightTaskId, trackHomeVisit, clearHighlight]);


  const renderFloorPlan = () => (
    <View style={styles.scrollView}>
      <GesturePanView 
        offsetX={floorPlanOffsetX}
        offsetY={floorPlanOffsetY}
        panGesture={floorPlanPanGesture}
        style={styles.scrollContent}
      >
        <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }, isGarageTabHighlight && { pointerEvents: 'none' }]}>
          <HomeFloorPlan
            onHackRigPress={isGarageTabHighlight ? () => {} : onNavigateToMap}
            onNavigateToBattle={isGarageTabHighlight ? () => {} : onNavigateToBattle}
          />
          <View style={styles.hackRigContainer}>
            <HackRigDisplay
              onPress={isGarageTabHighlight ? () => {} : onNavigateToMap}
              onNavigateToBattle={isGarageTabHighlight ? () => {} : onNavigateToBattle}
            />
          </View>
        </View>
      </GesturePanView>
    </View>
  );

  const renderGarage = () => (
    <View style={styles.scrollView}>
      <GesturePanView 
        offsetX={garageOffsetX}
        offsetY={garageOffsetY}
        panGesture={garagePanGesture}
        style={styles.garageScrollContent}
      >
        <View style={[styles.garageContainer, { borderColor: colors.matrix }, (isGarageTabHighlight || isBotAssemblyHighlight) && { pointerEvents: 'none' }]}>
          <View style={styles.botAssemblyContainer}>
            {!isBotAssemblyHighlight && (
              <BotAssembly 
                onPress={isGarageTabHighlight ? () => {} : onNavigateToBotAssembly} 
                isHighlighted={false}
              />
            )}
          </View>
        </View>
      </GesturePanView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ zIndex: (isGarageTabHighlight || isBotAssemblyHighlight) ? 3 : 1000, pointerEvents: (isGarageTabHighlight || isBotAssemblyHighlight) ? 'none' : 'auto' }}>
        <CloseButton onPress={onClose} />
      </View>
      
      {/* Fixed pill at top center of screen */}
      <View style={[styles.fixedHomePillWrapper, { zIndex: (isGarageTabHighlight || isBotAssemblyHighlight) ? 3 : 1000 }]}>
        <View style={[styles.fixedHomePill, { backgroundColor: '#2E7D32' }]}>
          <Text style={styles.fixedHomeText}>{activeTab === 'floorPlan' ? 'Main Floor' : 'Garage'}</Text>
        </View>
      </View>
      
      {/* Content based on active tab */}
      {activeTab === 'floorPlan' ? (
        <View key="floorPlan-view">
          {renderFloorPlan()}
        </View>
      ) : (
        <View key="garage-view">
          {renderGarage()}
        </View>
      )}
      
      {/* Tab Navigation - Fixed at bottom */}
      <View style={[styles.tabContainer, isGarageTabHighlight && { zIndex: 1000 }]}>
        <TabButton 
          label="Main Floor" 
          tab="floorPlan" 
          isActive={activeTab === 'floorPlan'}
          isHighlighted={false}
          colors={colors}
          onPress={setActiveTab}
          advanceHighlightStep={advanceHighlightStep}
        />
        <TabButton 
          label="Garage" 
          tab="garage" 
          isActive={activeTab === 'garage'}
          isHighlighted={isGarageTabHighlight}
          colors={colors}
          onPress={setActiveTab}
          advanceHighlightStep={advanceHighlightStep}
        />
      </View>
      {isBuildGuardians && (
        <TaskGuideHighlightOverlay 
          forGarageTab={isGarageTabHighlight}
          forBotAssembly={isBotAssemblyHighlight}
        />
      )}
      {isBotAssemblyHighlight && (
        <View style={styles.botAssemblyElevatedWrapper}>
          <BotAssembly 
            onPress={() => {
              advanceHighlightStep();
              onNavigateToBotAssembly();
            }} 
            isHighlighted={true}
          />
        </View>
      )}
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
  botAssemblyElevatedWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -250 }, { translateY: -187.5 }],
    width: 500,
    height: 375,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
