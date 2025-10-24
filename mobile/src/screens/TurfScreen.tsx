import React, {useState, useRef, useEffect, useCallback, memo, forwardRef, useImperativeHandle, useMemo} from 'react';
import {View, StyleSheet, ScrollView, Dimensions, Platform, StatusBar} from 'react-native';
import {Balance} from '../components/common/Balance';
import {HomeScreen} from './HomeScreen';
import {DigitalBarracksScreen} from './DigitalBarracksScreen';
import {ProfileScreen} from './ProfileScreen';
import {HackMapScreen} from './HackMapScreen';
import {BotAssemblyScreen} from './BotAssemblyScreen';
import {ResearchScreen} from './ResearchScreen';

import {useThemeColors} from '../hooks/useThemeColors';
import {ProfileLocation} from '../components/turf/ProfileLocation';
import {HomeLocation} from '../components/turf/HomeLocation';
import {DigitalBarracksLocation} from '../components/turf/DigitalBarracksLocation';
import {ResearchCenterLocation} from '../components/turf/ResearchCenterLocation';
import {DevelopmentZone, RentalHousingLocation, FutureBuildingPlaceholder} from '../components/turf';
import {BattlePreparationScreen} from './BattlePreparationScreen';
import {BattleGridScreen} from './BattleGridScreen';
import {InvestmentPropertyScreen} from './InvestmentPropertyScreen';
import {ErrorBoundary} from '../components/common/ErrorBoundary';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {fetchInitialData, setOnboardingCompleted, setShowOnboarding, setShowEmailVerification, setEmailVerificationPrompted} from '../store/slices/authSlice';
import {mapApi} from '../store/api/mapApi';
import {useGetRentalHousingStatusQuery, useCompleteRentalHousingMutation, useCompleteOnboardingMutation, authApi} from '../store/api/authApi';
import {OnboardingSlides} from '../components/onboarding';
import {TurfIntro} from '../components/turf-intro';

// Android-specific imports (only for Android)
let Gesture: any, GestureDetector: any, Animated: any, useSharedValue: any, useAnimatedStyle: any, withDecay: any, computePanBounds: any;
if (Platform.OS === 'android') {
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
}

const DiagonalLines = memo(({ colors }: { colors: any }) => (
  <>
    <View style={[styles.line1, { backgroundColor: colors.matrix + '1A' }]} />
    <View style={[styles.line2, { backgroundColor: colors.matrix + '14' }]} />
    <View style={[styles.line3, { backgroundColor: colors.matrix + '1F' }]} />
    <View style={[styles.thickLine1, { backgroundColor: colors.matrix + '0D' }]} />
    <View style={[styles.thickLine2, { backgroundColor: colors.matrix + '08' }]} />
  </>
));

const ScrollViewMemo = memo(function ScrollViewMemo({
  children,
  horizontalScrollRef,
  onScroll,
}: {
  children: React.ReactNode;
  horizontalScrollRef: React.RefObject<ScrollView>;
  onScroll?: (event: any) => void;
}) {
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const CONTENT_WIDTH = 2000;
  const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;

  return (
    <ScrollView
      ref={horizontalScrollRef}
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentOffset={{ x: CENTER_X, y: 0 }}
      scrollEnabled={true}
      maximumZoomScale={1}
      minimumZoomScale={1}
      bounces={false}
      onScroll={onScroll}
      contentContainerStyle={{
        width: 2000,
        height: 2000,
      }}
    >
      {children}
    </ScrollView>
  );
});

// Android-specific gesture pan view (only for Android)
const GesturePanView = memo(function GesturePanView({
  children,
  horizontalScrollRef,
  onScroll,
  offsetX,
  offsetY,
  panGesture,
}: {
  children: React.ReactNode;
  horizontalScrollRef: React.RefObject<ScrollView>;
  onScroll?: (event: any) => void;
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
    
    // Log style application when near bottom border
    const nearBottom = Math.abs(offsetY.value - 1552) < 100; // Assuming maxY is around 1552
    if (nearBottom) {
      console.log('🚨 TURF STYLE APPLICATION:', {
        offsetX: offsetX.value,
        offsetY: offsetY.value,
        transform,
        nearBottom,
        distanceFromBottom: Math.abs(offsetY.value - 1552),
        note: 'Style being applied near bottom border'
      });
    }
    
    return {
      transform,
    };
  }, [offsetX, offsetY]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.scrollContent, { borderColor: '#007AFF' }, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

export const TurfScreen = forwardRef<any, {}>((props, ref): React.JSX.Element => {
  const colors = useThemeColors();
  const [currentScreen, setCurrentScreen] = useState<'turf' | 'hackRig' | 'barracks' | 'botAssembly' | 'battlePrep' | 'battle' | 'map' | 'profile' | 'research' | 'investmentProperty'>('turf');
  const [battleId, setBattleId] = useState<string | null>(null);
  const [pendingNpcSlug, setPendingNpcSlug] = useState<string | null>(null);
  const [returnContext, setReturnContext] = useState<{ origin: 'hackRig' | 'map'; mapPan?: { x: number; y: number } } | null>(null);
  const [pendingNpcInstanceId, setPendingNpcInstanceId] = useState<string | null>(null);
  const [pendingDefenderUserId, setPendingDefenderUserId] = useState<string | null>(null);
  const [previousScreen, setPreviousScreen] = useState<'turf' | 'hackRig' | 'barracks' | 'botAssembly' | 'battlePrep' | 'battle' | 'map' | 'profile' | 'research' | 'investmentProperty'>('turf');
  const [currentPropertyId, setCurrentPropertyId] = useState<number>(1);
  const [turfViewPosition, setTurfViewPosition] = useState<{ x: number; y: number } | null>(null);
  const horizontalScrollRef = useRef<ScrollView>(null);
  const currentScrollPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dispatch = useAppDispatch();

  // Android-specific gesture state (only for Android)
  const offsetX: any = Platform.OS === 'android' ? useSharedValue(0) : null;
  const offsetY: any = Platform.OS === 'android' ? useSharedValue(0) : null;
  const startX: any = Platform.OS === 'android' ? useSharedValue(0) : null;
  const startY: any = Platform.OS === 'android' ? useSharedValue(0) : null;
  
  // Android-specific bounds state (only for Android)
  const minX: any = Platform.OS === 'android' ? useSharedValue(-1000000) : null;
  const maxX: any = Platform.OS === 'android' ? useSharedValue(1000000) : null;
  const minY: any = Platform.OS === 'android' ? useSharedValue(-1000000) : null;
  const maxY: any = Platform.OS === 'android' ? useSharedValue(1000000) : null;
  const boundsReady: any = Platform.OS === 'android' ? useSharedValue(false) : null;

  // Android-specific centering function
  const centerAndroidView = useCallback(() => {
    if (Platform.OS === 'android' && offsetX && offsetY) {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const CONTENT_WIDTH = 2000;
      const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
      
      // Center the Android view by setting the shared values
      offsetX.value = -CENTER_X;
      offsetY.value = 0;
    }
  }, [offsetX, offsetY]);

  // Onboarding state
  const showOnboarding = useAppSelector((state) => state.auth.showOnboarding);
  
  // Turf Intro state
  const showTurfIntro = useAppSelector((state) => state.auth.showTurfIntro);
  const [currentIntroStep, setCurrentIntroStep] = useState<'home' | 'barracks' | 'research' | 'investment1' | 'wallet' | 'profile' | null>(null);

  // Email verification state
  const { user, showEmailVerification, emailVerificationPromptedUserId } = useAppSelector((state) => state.auth);

  // Check for email verification on component mount for existing users
  useEffect(() => {
    if (user && !user.emailVerified && !user.emailVerificationToken && !user.emailVerificationPrompted && !showOnboarding && !showTurfIntro && !showEmailVerification && emailVerificationPromptedUserId !== user._id) {
      // Show email verification modal for existing users who haven't verified their email AND haven't been sent a verification email yet AND haven't been prompted before (either in session or database)
      dispatch(setShowEmailVerification(true));
      dispatch(setEmailVerificationPrompted(user._id));
    }
  }, [user, showOnboarding, showTurfIntro, showEmailVerification, emailVerificationPromptedUserId, dispatch]);

  // Android-specific status bar configuration (optional - hide status bar for immersive experience)
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Hide status bar for immersive experience (optional)
      StatusBar.setHidden(true, 'fade');
      
      // Cleanup: restore status bar when component unmounts
      return () => {
        StatusBar.setHidden(false, 'fade');
      };
    }
  }, []);

  // Android-specific bounds calculation (only for Android)
  useEffect(() => {
    if (Platform.OS === 'android' && minX && maxX && minY && maxY && boundsReady && computePanBounds) {
      const WINDOW_WIDTH = Dimensions.get('window').width;
      const WINDOW_HEIGHT = Dimensions.get('window').height;
      const SCREEN_WIDTH = Dimensions.get('screen').width;
      const SCREEN_HEIGHT = Dimensions.get('screen').height;
      const CONTENT_SIZE = 2000;
      const MARGIN_SIZE = 0; // No margin for turf screen
      
      // Hybrid approach: window for top/bottom, screen for left/right
      const ADJUSTED_WIDTH = SCREEN_WIDTH;  // Use screen width for left/right
      const ADJUSTED_HEIGHT = WINDOW_HEIGHT; // Use window height for top/bottom

      const bounds = computePanBounds({
        totalSize: CONTENT_SIZE,
        containerWidth: ADJUSTED_WIDTH,
        containerHeight: ADJUSTED_HEIGHT,
        marginSize: MARGIN_SIZE,
      });

      // Calculate Android header/toolbar height for landscape mode
      // Status bar is hidden, but we need to account for the space it would take
      // In landscape mode, status bar is typically 24-48dp, navigation bar is 48dp
      // Since status bar is hidden, we only need to account for navigation bar
      const ANDROID_NAVIGATION_BAR_HEIGHT = 24; // 24dp in landscape mode
      const ANDROID_HEADER_HEIGHT = ANDROID_NAVIGATION_BAR_HEIGHT; // Total hidden header height
      
      // Adjust only the bottom boundary to allow scroll past bottom by header height
      // This allows the bottom border to be visible when user scrolls past the normal bottom
      const adjustedBounds = {
        ...bounds,
        minY: bounds.minY - ANDROID_HEADER_HEIGHT // Allow scroll past bottom by header height
      };

      // Log bounds calculation for bottom border analysis
      console.log('🚨 TURF BOUNDS CALCULATION:', {
        WINDOW_HEIGHT,
        SCREEN_HEIGHT,
        ADJUSTED_HEIGHT,
        WINDOW_WIDTH,
        SCREEN_WIDTH,
        ADJUSTED_WIDTH,
        CONTENT_SIZE,
        bounds,
        adjustedBounds,
        androidHeaderHeight: ANDROID_HEADER_HEIGHT,
        bottomBorderAnalysis: {
          contentHeight: CONTENT_SIZE,
          containerHeight: ADJUSTED_HEIGHT,
          scrollableHeight: CONTENT_SIZE - ADJUSTED_HEIGHT,
          maxY: bounds.maxY,
          minY: bounds.minY,
          adjustedMinY: adjustedBounds.minY,
          bottomVisible: bounds.maxY > 0
        },
        note: 'Bounds calculation with Android header height adjustment for bottom border visibility'
      });

      minX.value = adjustedBounds.minX;
      maxX.value = adjustedBounds.maxX;
      minY.value = adjustedBounds.minY;
      maxY.value = adjustedBounds.maxY;
      boundsReady.value = true;
    }
  }, [minX, maxX, minY, maxY, boundsReady, computePanBounds]);

  // Expose horizontalScrollRef and centerAndroidView to parent component
  useImperativeHandle(ref, () => ({
    horizontalScrollRef: horizontalScrollRef,
    centerAndroidView: centerAndroidView
  }));

  // Track turf view position using ref to avoid re-renders
  const handleTurfScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    currentScrollPositionRef.current = { x: contentOffset.x, y: contentOffset.y };
  }, []);

  // Android-specific pan gesture (only for Android) - Optimized for performance
  const panGesture = Platform.OS === 'android' ? Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onStart(() => {
      'worklet';
      if (startX && startY && offsetX && offsetY) {
        startX.value = offsetX.value;
        startY.value = offsetY.value;
      }
    })
        .onUpdate((g: any) => {
          'worklet';
          if (startX && startY && offsetX && offsetY) {
            let x = startX.value + g.translationX;
            let y = startY.value + g.translationY;
            
            // Always enforce bounds if ready (hard stops)
            if (boundsReady && boundsReady.value && minX && maxX && minY && maxY) {
              const originalX = x;
              const originalY = y;
              x = Math.min(maxX.value, Math.max(minX.value, x));
              y = Math.min(maxY.value, Math.max(minY.value, y));
              
              // Log when reaching bottom border (Y position near maxY)
              const nearBottomBorder = Math.abs(y - maxY.value) < 50;
              const atBottomBorder = Math.abs(y - maxY.value) < 10;
              
              if (nearBottomBorder) {
                console.log('🚨 TURF BOTTOM BORDER APPROACH:', {
                  currentY: y,
                  maxY: maxY.value,
                  distanceFromBottom: Math.abs(y - maxY.value),
                  originalY,
                  translationY: g.translationY,
                  nearBottom: nearBottomBorder,
                  atBottom: atBottomBorder,
                  note: 'User approaching bottom border - checking visibility'
                });
              }
              
              // Log when actually at bottom border
              if (atBottomBorder) {
                console.log('🚨 TURF AT BOTTOM BORDER:', {
                  currentY: y,
                  maxY: maxY.value,
                  originalY,
                  translationY: g.translationY,
                  bounds: { minY: minY.value, maxY: maxY.value },
                  note: 'User at bottom border - bottom should be visible'
                });
              }
            }
            
            offsetX.value = x;
            offsetY.value = y;
          }
        })
        .onEnd((g: any) => {
          'worklet';
          if (offsetX && offsetY && boundsReady && boundsReady.value && minX && maxX && minY && maxY) {
            // Apply decay with boundary enforcement
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
        }) : null;

  // Fetch Property 1's status to determine Property 2's rendering
  const { data: property1Status } = useGetRentalHousingStatusQuery(1);
  const property1Unlocked = property1Status?.isUnlocked || false;

  // Fetch Property 2's status to determine Property 3's rendering
  const { data: property2Status } = useGetRentalHousingStatusQuery(2);
  const property2Unlocked = property2Status?.isUnlocked || false;

  // Fetch Property 3's status to determine Property 4's rendering
  const { data: property3Status } = useGetRentalHousingStatusQuery(3);
  const property3Unlocked = property3Status?.isUnlocked || false;

  // Fetch Property 4's status
  const { data: property4Status } = useGetRentalHousingStatusQuery(4);

  // Get the completeRentalHousing mutation
  const [completeRentalHousing] = useCompleteRentalHousingMutation();
  
  // Get the completeOnboarding mutation
  const [completeOnboarding] = useCompleteOnboardingMutation();

  // Memoize completion functions to prevent infinite re-renders
  const handleProperty1Complete = useCallback(async () => {
    try {
      // Only complete if there's an active build
      if (property1Status?.buildStatus?.completesAt) {
        const result = await completeRentalHousing(1).unwrap();
      }
    } catch (error) {
      console.error('Error completing property 1 build:', error);
    }
  }, [completeRentalHousing, property1Status?.buildStatus?.completesAt]);

  const handleProperty2Complete = useCallback(async () => {
    try {
      // Only complete if there's an active build
      if (property2Status?.buildStatus?.completesAt) {
        const result = await completeRentalHousing(2).unwrap();
      }
    } catch (error) {
      console.error('Error completing property 2 build:', error);
    }
  }, [completeRentalHousing, property2Status?.buildStatus?.completesAt]);

  const handleProperty3Complete = useCallback(async () => {
    try {
      // Only complete if there's an active build
      if (property3Status?.buildStatus?.completesAt) {
        const result = await completeRentalHousing(3).unwrap();
      }
    } catch (error) {
      console.error('Error completing property 3 build:', error);
    }
  }, [completeRentalHousing, property3Status?.buildStatus?.completesAt]);

  const handleProperty4Complete = useCallback(async () => {
    try {
      // Only complete if there's an active build
      if (property4Status?.buildStatus?.completesAt) {
        const result = await completeRentalHousing(4).unwrap();
      }
    } catch (error) {
      console.error('Error completing property 4 build:', error);
    }
  }, [completeRentalHousing, property4Status?.buildStatus?.completesAt]);

  // Memoize building properties array to prevent infinite re-renders
  const buildingProperties = useMemo(() => {
    const properties = [];
    
    // Only include properties that are actively building
    if (property1Status?.buildStatus?.completesAt) {
      properties.push({
        propertyId: 1,
        buildStatus: property1Status.buildStatus,
        onComplete: handleProperty1Complete
      });
    }
    
    if (property2Status?.buildStatus?.completesAt) {
      properties.push({
        propertyId: 2,
        buildStatus: property2Status.buildStatus,
        onComplete: handleProperty2Complete
      });
    }
    
    if (property3Status?.buildStatus?.completesAt) {
      properties.push({
        propertyId: 3,
        buildStatus: property3Status.buildStatus,
        onComplete: handleProperty3Complete
      });
    }
    
    if (property1Unlocked && property2Unlocked && property3Unlocked && property4Status?.buildStatus?.completesAt) {
      properties.push({
        propertyId: 4,
        buildStatus: property4Status.buildStatus,
        onComplete: handleProperty4Complete
      });
    }
    
    return properties;
  }, [
    property1Status?.buildStatus?.completesAt,
    property2Status?.buildStatus?.completesAt,
    property3Status?.buildStatus?.completesAt,
    property4Status?.buildStatus?.completesAt,
    property1Unlocked,
    property2Unlocked,
    property3Unlocked,
    handleProperty1Complete,
    handleProperty2Complete,
    handleProperty3Complete,
    handleProperty4Complete
  ]);

  // Onboarding handlers
  const handleOnboardingComplete = useCallback(async () => {
    try {
      await completeOnboarding().unwrap();
      dispatch(setOnboardingCompleted());
      
      // Center the view on home/digital barracks after onboarding completion
      setTimeout(() => {
        if (Platform.OS === 'android') {
          centerAndroidView();
        } else {
          const SCREEN_WIDTH = Dimensions.get('window').width;
          const CONTENT_WIDTH = 2000;
          const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
          horizontalScrollRef.current?.scrollTo({
            x: CENTER_X,
            y: 0,
            animated: false,
          });
        }
      }, 0);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still update local state even if API call fails
      dispatch(setOnboardingCompleted());
      
      // Center the view even if API call fails
      setTimeout(() => {
        if (Platform.OS === 'android') {
          centerAndroidView();
        } else {
          const SCREEN_WIDTH = Dimensions.get('window').width;
          const CONTENT_WIDTH = 2000;
          const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
          horizontalScrollRef.current?.scrollTo({
            x: CENTER_X,
            y: 0,
            animated: false,
          });
        }
      }, 0);
    }
  }, [dispatch, completeOnboarding, centerAndroidView]);

  const handleOnboardingSkip = useCallback(async () => {
    try {
      await completeOnboarding().unwrap();
      dispatch(setOnboardingCompleted());
      
      // Center the view on home/digital barracks after skipping onboarding
      setTimeout(() => {
        if (Platform.OS === 'android') {
          centerAndroidView();
        } else {
          const SCREEN_WIDTH = Dimensions.get('window').width;
          const CONTENT_WIDTH = 2000;
          const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
          horizontalScrollRef.current?.scrollTo({
            x: CENTER_X,
            y: 0,
            animated: false,
          });
        }
      }, 0);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      // Still update local state even if API call fails
      dispatch(setOnboardingCompleted());
      
      // Center the view even if API call fails
      setTimeout(() => {
        if (Platform.OS === 'android') {
          centerAndroidView();
        } else {
          const SCREEN_WIDTH = Dimensions.get('window').width;
          const CONTENT_WIDTH = 2000;
          const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
          horizontalScrollRef.current?.scrollTo({
            x: CENTER_X,
            y: 0,
            animated: false,
          });
        }
      }, 0);
    }
  }, [dispatch, completeOnboarding, centerAndroidView]);

  // Turf Intro handlers
  const handleTurfIntroComplete = useCallback(() => {
    
    // Reset intro step
    setCurrentIntroStep(null);
    
    // Center the view on home/digital barracks after turf intro completion
    setTimeout(() => {
      if (Platform.OS === 'android') {
        centerAndroidView();
      } else {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        horizontalScrollRef.current?.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }
    }, 0);

    // Check if user needs email verification after turf intro
    if (user && !user.emailVerified && !user.emailVerificationToken && !user.emailVerificationPrompted && emailVerificationPromptedUserId !== user._id) {
      dispatch(setShowEmailVerification(true));
      dispatch(setEmailVerificationPrompted(user._id));
    }
  }, [user, emailVerificationPromptedUserId, dispatch, centerAndroidView]);

  const handleTurfIntroSkip = useCallback(() => {
    
    // Reset intro step
    setCurrentIntroStep(null);
    
    // Center the view on home/digital barracks after skipping turf intro
    setTimeout(() => {
      if (Platform.OS === 'android') {
        centerAndroidView();
      } else {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        horizontalScrollRef.current?.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }
    }, 0);

    // Check if user needs email verification after turf intro
    if (user && !user.emailVerified && !user.emailVerificationToken && !user.emailVerificationPrompted && emailVerificationPromptedUserId !== user._id) {
      dispatch(setShowEmailVerification(true));
      dispatch(setEmailVerificationPrompted(user._id));
    }
  }, [user, emailVerificationPromptedUserId, dispatch, centerAndroidView]);

  const handleTurfIntroStepChange = useCallback((step: 'home' | 'barracks' | 'research' | 'investment1' | 'wallet' | 'profile') => {
    setCurrentIntroStep(step);
  }, []);

  const navigateToScreen = useCallback((screen: 'turf' | 'hackRig' | 'barracks' | 'botAssembly' | 'battlePrep' | 'battle' | 'map' | 'profile' | 'research' | 'investmentProperty') => {
    const previousScreenBeforeUpdate = currentScreen;
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
    
    // If returning to turf, handle different behaviors based on previous screen
    if (screen === 'turf') {
      // Home, Digital Barracks, and Profile should always center on home/digital barracks
      if (['hackRig', 'barracks', 'profile'].includes(previousScreenBeforeUpdate)) {
        // Clear any saved position and center the view
        setTurfViewPosition(null);
        setTimeout(() => {
          if (Platform.OS === 'android') {
            // Use Android centering function
            centerAndroidView();
          } else {
            const SCREEN_WIDTH = Dimensions.get('window').width;
            const CONTENT_WIDTH = 2000;
            const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
            horizontalScrollRef.current?.scrollTo({
              x: CENTER_X,
              y: 0,
              animated: false,
            });
          }
        }, 0);
      } else if (turfViewPosition) {
        // Research and Investment Properties should restore their last position
        setTimeout(() => {
          if (Platform.OS === 'android') {
            // For Android, set the shared values to the saved position
            if (offsetX && offsetY) {
              offsetX.value = -turfViewPosition.x;
              offsetY.value = -turfViewPosition.y;
            }
          } else {
            horizontalScrollRef.current?.scrollTo({
              x: turfViewPosition.x,
              y: turfViewPosition.y,
              animated: false,
            });
          }
        }, 0);
      }
    }
  }, [currentScreen, turfViewPosition, centerAndroidView, offsetX, offsetY]);

  const navigateToFloorPlan = useCallback((propertyId: number) => {
    // Capture current turf view position
    if (Platform.OS === 'android') {
      // For Android, capture the current offset values
      if (offsetX && offsetY) {
        setTurfViewPosition({ x: -offsetX.value, y: -offsetY.value });
      }
    } else {
      // For iOS, capture from the ref
      if (currentScrollPositionRef.current) {
        setTurfViewPosition(currentScrollPositionRef.current);
      }
    }
    setCurrentPropertyId(propertyId);
    navigateToScreen('investmentProperty');
  }, [navigateToScreen, offsetX, offsetY]);

  const handleBattleEnd = useCallback(() => {
    navigateToScreen('hackRig');
  }, [dispatch, navigateToScreen]);

  const centerView = useCallback(() => {
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CONTENT_WIDTH = 2000;
    const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;

    if (Platform.OS === 'android') {
      // For Android, use the centering function
      centerAndroidView();
    } else {
      // If we have a saved turf view position, restore it; otherwise center the view
      if (turfViewPosition && currentScreen === 'turf') {
        horizontalScrollRef.current?.scrollTo({
          x: turfViewPosition.x,
          y: turfViewPosition.y,
          animated: false,
        });
      } else {
        // Set initial scroll position without animation
        horizontalScrollRef.current?.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }
    }
  }, [turfViewPosition, currentScreen, centerAndroidView]);

  useEffect(() => {
    // Center the view immediately when the screen mounts
    centerView();
  }, [centerView]); // Include centerView in dependencies

  useEffect(() => {
    // Clean up pending data when navigating away from battlePrep
    if (currentScreen !== 'battlePrep') {
      setPendingDefenderUserId(null);
      setPendingNpcSlug(null);
      setPendingNpcInstanceId(null);
    }
  }, [currentScreen]);

  const renderScreen = useCallback(() => {
    switch (currentScreen) {
      case 'hackRig':
        return <HomeScreen
          onClose={() => navigateToScreen('turf')}
          onNavigateToMap={() => navigateToScreen('map')}
          onNavigateToBotAssembly={() => navigateToScreen('botAssembly')}
          onNavigateToBattle={() => navigateToScreen('battlePrep')}
        />;
      case 'barracks':
        return <DigitalBarracksScreen
          onClose={() => navigateToScreen('turf')}
        />;
      case 'map':
        return <HackMapScreen
          restorePan={returnContext?.mapPan}
          onClose={() => {
            const slug = (globalThis as any).pendingNpcSlug as string | undefined;
            const defenderUserId = (globalThis as any).pendingDefenderUserId as string | undefined;
            
            if (slug) {
              setPendingNpcSlug(slug);
              const instanceId = (globalThis as any).pendingNpcInstanceId as string | undefined;
              setPendingNpcInstanceId(instanceId || null);
              const mapPan = (globalThis as any).pendingMapPan as { x: number; y: number } | undefined;
              (globalThis as any).pendingNpcSlug = undefined;
              (globalThis as any).pendingNpcInstanceId = undefined;
              (globalThis as any).pendingMapPan = undefined;
              setReturnContext({ origin: 'map', mapPan });
              navigateToScreen('battlePrep');
              return;
            }
            
            if (defenderUserId) {
              setPendingDefenderUserId(defenderUserId);
              const mapPan = (globalThis as any).pendingMapPan as { x: number; y: number } | undefined;
              (globalThis as any).pendingDefenderUserId = undefined;
              (globalThis as any).pendingMapPan = undefined;
              setReturnContext({ origin: 'map', mapPan });
              navigateToScreen('battlePrep');
              return;
            }
            
            navigateToScreen('hackRig');
          }}
        />;
      case 'profile':
        return <ProfileScreen
          onClose={() => navigateToScreen('turf')}
        />;
      case 'research':
        return <ResearchScreen
          onClose={() => navigateToScreen('turf')}
        />;
      case 'botAssembly':
        return <BotAssemblyScreen
          onClose={() => navigateToScreen(previousScreen)}
        />;
      case 'battlePrep':
        return <BattlePreparationScreen
          onClose={() => navigateToScreen(previousScreen)}
          onBattleStart={(newBattleId) => {
            setBattleId(newBattleId || null);
            navigateToScreen('battle');
          }}
          defenderId={pendingDefenderUserId || undefined}
          defenderNpcSlug={pendingNpcSlug || undefined}
          defenderNpcInstanceId={pendingNpcInstanceId || undefined}
        />;
      case 'battle':
        if (!battleId) {
          return <BattlePreparationScreen
            onClose={() => navigateToScreen(previousScreen)}
            onBattleStart={(newBattleId) => {
              setBattleId(newBattleId || null);
              navigateToScreen('battle');
            }}
          />;
        }
        return <BattleGridScreen
          battleId={battleId}
          _onClose={() => {
            // Invalidate map cache to ensure fresh data after battle end
            // This prevents the "ghost NPC" issue where defeated NPCs still appear on the map
            dispatch(mapApi.util.invalidateTags(['Map']));
            
            // Invalidate user profile cache to ensure fresh experience/level data
            dispatch(authApi.util.invalidateTags(['User']));
            
            // Return to origin without resetting app
            if (returnContext?.origin === 'map') {
              navigateToScreen('map');
            } else {
              navigateToScreen('hackRig');
            }
            setBattleId(null);
          }}
        />;
      case 'investmentProperty':
        return <InvestmentPropertyScreen
          propertyId={currentPropertyId}
          onBack={() => {
            navigateToScreen(previousScreen);
            // Restore turf view position when returning
            if (turfViewPosition) {
              setTimeout(() => {
                if (Platform.OS === 'android') {
                  // For Android, set the shared values to the saved position
                  if (offsetX && offsetY) {
                    offsetX.value = -turfViewPosition.x;
                    offsetY.value = -turfViewPosition.y;
                  }
                } else {
                  horizontalScrollRef.current?.scrollTo({
                    x: turfViewPosition.x,
                    y: turfViewPosition.y,
                    animated: false,
                  });
                }
              }, 100); // Small delay to ensure screen transition completes
            }
          }}
        />;
      default:
        return (
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ErrorBoundary>
              <Balance isIntroActive={currentIntroStep === 'wallet'} />
            </ErrorBoundary>
            <View style={styles.scrollWrapper}>
              {Platform.OS === 'ios' ? (
                <ScrollViewMemo horizontalScrollRef={horizontalScrollRef} onScroll={handleTurfScroll}>
                  <View style={[styles.scrollContent, { backgroundColor: colors.background, borderColor: colors.secondary + '99' }]}>
                    <DiagonalLines colors={colors} />
                    <View style={[styles.digitalGround, { backgroundColor: colors.matrix + '0D', borderColor: colors.matrix + '33' }]}>
                      <HomeLocation onPress={() => navigateToScreen('hackRig')} isIntroActive={currentIntroStep === 'home'} />
                      <DigitalBarracksLocation onPress={() => navigateToScreen('barracks')} isIntroActive={currentIntroStep === 'barracks'} />
                    </View>
                    <ResearchCenterLocation 
                      onNavigateToResearch={() => {
                        // Capture current turf view position before navigating
                        if (Platform.OS === 'android') {
                          // For Android, capture the current offset values
                          if (offsetX && offsetY) {
                            setTurfViewPosition({ x: -offsetX.value, y: -offsetY.value });
                          }
                        } else {
                          // For iOS, capture from the ref
                          if (currentScrollPositionRef.current) {
                            setTurfViewPosition(currentScrollPositionRef.current);
                          }
                        }
                        navigateToScreen('research');
                      }} 
                      isIntroActive={currentIntroStep === 'research'}
                    />
                    <DevelopmentZone buildingProperties={buildingProperties}>
                      {/* Property 2: Conditionally render based on Property 1's unlock status */}
                      {(() => {
                        return property1Unlocked ? (
                          <RentalHousingLocation 
                            propertyId={2}
                            onNavigateToRentalHousing={() => navigateToScreen('turf')}
                            onNavigateToFloorPlan={navigateToFloorPlan}
                            showTimer={false}
                            isIntroActive={currentIntroStep === 'investment1'}
                          />
                        ) : (
                          <FutureBuildingPlaceholder propertyNumber={2} />
                        );
                      })()}

                      {/* Property 3: Conditionally render based on Properties 1 & 2 being unlocked */}
                      {(() => {
                        return (property1Unlocked && property2Unlocked) ? (
                          <RentalHousingLocation 
                            propertyId={3}
                            onNavigateToRentalHousing={() => navigateToScreen('turf')}
                            onNavigateToFloorPlan={navigateToFloorPlan}
                            showTimer={false}
                            isIntroActive={currentIntroStep === 'investment1'}
                          />
                        ) : (
                          <FutureBuildingPlaceholder propertyNumber={3} />
                        );
                      })()}

                      <RentalHousingLocation 
                        propertyId={1}
                        onNavigateToRentalHousing={() => navigateToScreen('turf')}
                        onNavigateToFloorPlan={navigateToFloorPlan}
                        showTimer={false}
                        isIntroActive={currentIntroStep === 'investment1'}
                      />

                      {/* Property 4: Conditionally render based on Properties 1, 2 & 3 being unlocked */}
                      {(() => {
                        return (property1Unlocked && property2Unlocked && property3Unlocked) ? (
                          <RentalHousingLocation 
                            propertyId={4}
                            onNavigateToRentalHousing={() => navigateToScreen('turf')}
                            onNavigateToFloorPlan={navigateToFloorPlan}
                            showTimer={false}
                            isIntroActive={currentIntroStep === 'investment1'}
                          />
                        ) : (
                          <FutureBuildingPlaceholder propertyNumber={4} />
                        );
                      })()}
                    </DevelopmentZone>
                  </View>
                </ScrollViewMemo>
              ) : (
                <GesturePanView 
                  horizontalScrollRef={horizontalScrollRef} 
                  onScroll={handleTurfScroll}
                  offsetX={offsetX}
                  offsetY={offsetY}
                  panGesture={panGesture}
                >
                  <DiagonalLines colors={colors} />
                  <View style={[styles.digitalGround, { backgroundColor: colors.matrix + '0D', borderColor: colors.matrix + '33' }]}>
                    <HomeLocation onPress={() => navigateToScreen('hackRig')} isIntroActive={currentIntroStep === 'home'} />
                    <DigitalBarracksLocation onPress={() => navigateToScreen('barracks')} isIntroActive={currentIntroStep === 'barracks'} />
                  </View>
                  <ResearchCenterLocation 
                    onNavigateToResearch={() => {
                      // Capture current turf view position before navigating
                      if (Platform.OS === 'android') {
                        // For Android, capture the current offset values
                        if (offsetX && offsetY) {
                          setTurfViewPosition({ x: -offsetX.value, y: -offsetY.value });
                        }
                      } else {
                        // For iOS, capture from the ref
                        if (currentScrollPositionRef.current) {
                          setTurfViewPosition(currentScrollPositionRef.current);
                        }
                      }
                      navigateToScreen('research');
                    }} 
                    isIntroActive={currentIntroStep === 'research'}
                  />
                  <DevelopmentZone buildingProperties={buildingProperties}>
                    {/* Property 2: Conditionally render based on Property 1's unlock status */}
                    {(() => {
                      return property1Unlocked ? (
                        <RentalHousingLocation 
                          propertyId={2}
                          onNavigateToRentalHousing={() => navigateToScreen('turf')}
                          onNavigateToFloorPlan={navigateToFloorPlan}
                          showTimer={false}
                          isIntroActive={currentIntroStep === 'investment1'}
                        />
                      ) : (
                        <FutureBuildingPlaceholder propertyNumber={2} />
                      );
                    })()}

                    {/* Property 3: Conditionally render based on Properties 1 & 2 being unlocked */}
                    {(() => {
                      return (property1Unlocked && property2Unlocked) ? (
                        <RentalHousingLocation 
                          propertyId={3}
                          onNavigateToRentalHousing={() => navigateToScreen('turf')}
                          onNavigateToFloorPlan={navigateToFloorPlan}
                          showTimer={false}
                          isIntroActive={currentIntroStep === 'investment1'}
                        />
                      ) : (
                        <FutureBuildingPlaceholder propertyNumber={3} />
                      );
                    })()}

                    <RentalHousingLocation 
                      propertyId={1}
                      onNavigateToRentalHousing={() => navigateToScreen('turf')}
                      onNavigateToFloorPlan={navigateToFloorPlan}
                      showTimer={false}
                      isIntroActive={currentIntroStep === 'investment1'}
                    />

                    {/* Property 4: Conditionally render based on Properties 1, 2 & 3 being unlocked */}
                    {(() => {
                      return (property1Unlocked && property2Unlocked && property3Unlocked) ? (
                        <RentalHousingLocation 
                          propertyId={4}
                          onNavigateToRentalHousing={() => navigateToScreen('turf')}
                          onNavigateToFloorPlan={navigateToFloorPlan}
                          showTimer={false}
                          isIntroActive={currentIntroStep === 'investment1'}
                        />
                      ) : (
                        <FutureBuildingPlaceholder propertyNumber={4} />
                      );
                    })()}
                  </DevelopmentZone>
                </GesturePanView>
              )}
            </View>
            <ProfileLocation onPress={() => navigateToScreen('profile')} isIntroActive={currentIntroStep === 'profile'} />
          </View>
        );
    }
  }, [currentScreen, navigateToScreen, battleId, handleBattleEnd, colors, currentPropertyId, navigateToFloorPlan, previousScreen, turfViewPosition, property1Unlocked, property2Unlocked, property3Unlocked, handleTurfScroll, property4Status, buildingProperties, showOnboarding, handleOnboardingComplete, handleOnboardingSkip, showTurfIntro, handleTurfIntroComplete, handleTurfIntroSkip, currentIntroStep]);

  return (
    <>
      {renderScreen()}
      {showOnboarding && (
        <OnboardingSlides
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
      {showTurfIntro && (
        <TurfIntro
          onComplete={handleTurfIntroComplete}
          onSkip={handleTurfIntroSkip}
          horizontalScrollRef={horizontalScrollRef}
          onStepChange={handleTurfIntroStepChange}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1,
  },
  turfGrid: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
  },
  homePosition: {
    position: 'absolute',
    top: '50%',
    left: '25%',
    transform: [{translateX: -60}, {translateY: -80}],
    zIndex: 3,
  },
  barracksPosition: {
    position: 'absolute',
    top: '50%',
    right: '25%',
    transform: [{translateX: 60}, {translateY: -80}],
    zIndex: 3,
  },
  digitalGround: {
    position: 'absolute',
    top: 100,
    left: 700,
    width: 600,
    height: 220,
    borderRadius: 8,
    zIndex: 1,
  },
  scrollWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    width: 2000,
    height: 2000,
    position: 'relative',
    borderWidth: 3,
    borderRadius: 8,
  },
  gridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    opacity: 0.1,
  },
  line1: {
    position: 'absolute',
    width: '200%',
    height: 1,
    transform: [{ rotate: '45deg' }],
    top: '20%',
    left: '-50%',
  },
  line2: {
    position: 'absolute',
    width: '200%',
    height: 1,
    transform: [{ rotate: '-30deg' }],
    top: '40%',
    left: '-50%',
  },
  line3: {
    position: 'absolute',
    width: '200%',
    height: 1,
    transform: [{ rotate: '15deg' }],
    top: '60%',
    left: '-50%',
  },
  thickLine1: {
    position: 'absolute',
    width: '200%',
    height: 3,
    transform: [{ rotate: '-60deg' }],
    top: '30%',
    left: '-50%',
  },
  thickLine2: {
    position: 'absolute',
    width: '200%',
    height: 4,
    transform: [{ rotate: '75deg' }],
    top: '70%',
    left: '-50%',
  },
});
