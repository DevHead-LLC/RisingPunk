import { useCallback, useEffect, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';

const reanimated = require('react-native-reanimated');
const gestureHandler = require('react-native-gesture-handler');
const mapPanBounds = require('../utils/mapPanBounds');

const useSharedValue = reanimated.useSharedValue;
const Gesture = gestureHandler.Gesture;
const computePanBounds = mapPanBounds.computePanBounds;
const withDecay = reanimated.withDecay;

export interface UsePanGestureOptions {
  /** When true, center content vertically (e.g. garage). When false, use y=0 (e.g. main floor). */
  centerVertically?: boolean;
}

/**
 * Shared pan/gesture logic for a pannable content area (e.g. floor plan, garage).
 * Returns offset shared values, a Pan gesture, and a centerView callback.
 */
export function usePanGesture(
  contentWidth: number,
  contentHeight: number,
  options: UsePanGestureOptions = {}
): {
  offsetX: ReturnType<typeof useSharedValue>;
  offsetY: ReturnType<typeof useSharedValue>;
  panGesture: ReturnType<typeof Gesture.Pan> | null;
  centerView: () => void;
} {
  const { centerVertically = false } = options;

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const minX = useSharedValue(-1000000);
  const maxX = useSharedValue(1000000);
  const minY = useSharedValue(-1000000);
  const maxY = useSharedValue(1000000);
  const boundsReady = useSharedValue(false);

  const centerView = useCallback(() => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const CENTER_X = (contentWidth - screenWidth) / 2;
    const CENTER_Y = centerVertically ? (contentHeight - screenHeight) / 2 : 0;
    let x = -CENTER_X;
    let y = -CENTER_Y;
    if (boundsReady.value) {
      x = Math.min(maxX.value, Math.max(minX.value, x));
      y = Math.min(maxY.value, Math.max(minY.value, y));
    }
    offsetX.value = x;
    offsetY.value = y;
  }, [
    contentWidth,
    contentHeight,
    centerVertically,
    offsetX,
    offsetY,
    boundsReady,
    minX,
    maxX,
    minY,
    maxY,
  ]);

  useEffect(() => {
    if (!computePanBounds) return;
    const WINDOW_WIDTH = Dimensions.get('window').width;
    const WINDOW_HEIGHT = Dimensions.get('window').height;
    const MARGIN_SIZE = 0;
    let ADJUSTED_WIDTH = WINDOW_WIDTH;
    let ADJUSTED_HEIGHT = WINDOW_HEIGHT;
    if (Platform.OS === 'android') {
      ADJUSTED_WIDTH = Dimensions.get('screen').width;
    }
    const boundsX = computePanBounds({
      totalSize: contentWidth,
      containerWidth: ADJUSTED_WIDTH,
      containerHeight: ADJUSTED_HEIGHT,
      marginSize: MARGIN_SIZE,
    });
    const boundsY = computePanBounds({
      totalSize: contentHeight,
      containerWidth: ADJUSTED_WIDTH,
      containerHeight: ADJUSTED_HEIGHT,
      marginSize: MARGIN_SIZE,
    });
    let adjustedBounds: { minX: number; maxX: number; minY: number; maxY: number };
    if (Platform.OS === 'android') {
      const ANDROID_NAVIGATION_BAR_HEIGHT = 24;
      const ANDROID_HEADER_HEIGHT = ANDROID_NAVIGATION_BAR_HEIGHT;
      adjustedBounds = {
        minX: boundsX.minX,
        maxX: boundsX.maxX,
        minY: boundsY.minY - ANDROID_HEADER_HEIGHT,
        maxY: boundsY.maxY,
      };
    } else {
      adjustedBounds = {
        minX: boundsX.minX,
        maxX: boundsX.maxX,
        minY: boundsY.minY,
        maxY: boundsY.maxY,
      };
    }
    minX.value = adjustedBounds.minX;
    maxX.value = adjustedBounds.maxX;
    minY.value = adjustedBounds.minY;
    maxY.value = adjustedBounds.maxY;
    boundsReady.value = true;
  }, [contentWidth, contentHeight, minX, maxX, minY, maxY, boundsReady]);

  const panGesture = useMemo(() => {
    if (!Gesture || !computePanBounds) return null;
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
            clamp: [minX.value, maxX.value],
          });
          offsetY.value = withDecay({
            velocity: g.velocityY,
            deceleration: 0.99,
            clamp: [minY.value, maxY.value],
          });
        }
      });
  }, [
    offsetX,
    offsetY,
    startX,
    startY,
    boundsReady,
    minX,
    maxX,
    minY,
    maxY,
    withDecay,
  ]);

  return { offsetX, offsetY, panGesture, centerView };
}
