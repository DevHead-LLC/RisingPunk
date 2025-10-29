import React, { useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { FloorPlan } from '../components/common/FloorPlan';

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

  const centerAndroidView = useCallback(() => {
    if (Platform.OS === 'android') {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const CENTER_X = (FLOOR_PLAN_WIDTH - SCREEN_WIDTH) / 2;
      
      offsetX.value = -CENTER_X;
      offsetY.value = 0;
    }
  }, [offsetX, offsetY, FLOOR_PLAN_WIDTH]);

  useEffect(() => {
    if (Platform.OS === 'android' && computePanBounds) {
      const WINDOW_WIDTH = Dimensions.get('window').width;
      const WINDOW_HEIGHT = Dimensions.get('window').height;
      const SCREEN_WIDTH = Dimensions.get('screen').width;
      const SCREEN_HEIGHT = Dimensions.get('screen').height;
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

      minX.value = adjustedBounds.minX;
      maxX.value = adjustedBounds.maxX;
      minY.value = adjustedBounds.minY;
      maxY.value = adjustedBounds.maxY;
      boundsReady.value = true;
    }
  }, [minX, maxX, minY, maxY, boundsReady, computePanBounds, FLOOR_PLAN_WIDTH, FLOOR_PLAN_HEIGHT]);

  const panGesture = useMemo(() => {
    if (Platform.OS === 'android') {
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
  }, [offsetX, offsetY, startX, startY, boundsReady, minX, maxX, minY, maxY, withDecay]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      setTimeout(() => {
        centerAndroidView();
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
  }, [propertyId, centerAndroidView, FLOOR_PLAN_WIDTH]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onBack} />
      
      {/* Fixed Property pill at top center of screen */}
      <View style={[styles.fixedPropertyPill, { backgroundColor: colors.primary }]}>
        <Text style={styles.fixedPropertyText}>Property {propertyId}</Text>
      </View>
      
      {Platform.OS === 'ios' ? (
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
            <FloorPlan propertyId={propertyId} />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.scrollView}>
          <GesturePanView 
            offsetX={offsetX}
            offsetY={offsetY}
            panGesture={panGesture}
          >
            <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }]}>
              <FloorPlan propertyId={propertyId} />
            </View>
          </GesturePanView>
        </View>
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
    top: 15, // Moved up slightly from 20px
    left: '50%',
    transform: [{ translateX: -70 }], // Adjusted for smaller width
    paddingHorizontal: 25, // Reduced from 30px
    paddingVertical: 12, // Reduced from 15px
    borderRadius: 25,
    minWidth: 140, // Reduced from 160px
    zIndex: 1000, // Ensure it's above everything
  },
  fixedPropertyText: {
    fontSize: 20, // Reduced from 24px
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});
