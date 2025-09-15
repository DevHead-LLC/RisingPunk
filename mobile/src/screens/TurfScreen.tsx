import React, {useState, useRef, useEffect, useCallback, memo, forwardRef, useImperativeHandle, useMemo} from 'react';
import {View, StyleSheet, ScrollView, Dimensions} from 'react-native';
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

  // Onboarding state
  const showOnboarding = useAppSelector((state) => state.auth.showOnboarding);
  
  // Turf Intro state
  const showTurfIntro = useAppSelector((state) => state.auth.showTurfIntro);

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

  // Expose horizontalScrollRef to parent component
  useImperativeHandle(ref, () => ({
    horizontalScrollRef: horizontalScrollRef
  }));

  // Track turf view position using ref to avoid re-renders
  const handleTurfScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    currentScrollPositionRef.current = { x: contentOffset.x, y: contentOffset.y };
  }, []);

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
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        horizontalScrollRef.current?.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }, 0);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Still update local state even if API call fails
      dispatch(setOnboardingCompleted());
      
      // Center the view even if API call fails
      setTimeout(() => {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        horizontalScrollRef.current?.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }, 0);
    }
  }, [dispatch, completeOnboarding]);

  const handleOnboardingSkip = useCallback(async () => {
    try {
      await completeOnboarding().unwrap();
      dispatch(setOnboardingCompleted());
      
      // Center the view on home/digital barracks after skipping onboarding
      setTimeout(() => {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        horizontalScrollRef.current?.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }, 0);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      // Still update local state even if API call fails
      dispatch(setOnboardingCompleted());
      
      // Center the view even if API call fails
      setTimeout(() => {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        horizontalScrollRef.current?.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: false,
        });
      }, 0);
    }
  }, [dispatch, completeOnboarding]);

  // Turf Intro handlers
  const handleTurfIntroComplete = useCallback(() => {
    console.log('Turf Intro completed');
    
    // Center the view on home/digital barracks after turf intro completion
    setTimeout(() => {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const CONTENT_WIDTH = 2000;
      const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
      horizontalScrollRef.current?.scrollTo({
        x: CENTER_X,
        y: 0,
        animated: false,
      });
    }, 0);

    // Check if user needs email verification after turf intro
    if (user && !user.emailVerified && !user.emailVerificationToken && !user.emailVerificationPrompted && emailVerificationPromptedUserId !== user._id) {
      dispatch(setShowEmailVerification(true));
      dispatch(setEmailVerificationPrompted(user._id));
    }
  }, [user, emailVerificationPromptedUserId, dispatch]);

  const handleTurfIntroSkip = useCallback(() => {
    console.log('Turf Intro skipped');
    
    // Center the view on home/digital barracks after skipping turf intro
    setTimeout(() => {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const CONTENT_WIDTH = 2000;
      const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
      horizontalScrollRef.current?.scrollTo({
        x: CENTER_X,
        y: 0,
        animated: false,
      });
    }, 0);

    // Check if user needs email verification after turf intro
    if (user && !user.emailVerified && !user.emailVerificationToken && !user.emailVerificationPrompted && emailVerificationPromptedUserId !== user._id) {
      dispatch(setShowEmailVerification(true));
      dispatch(setEmailVerificationPrompted(user._id));
    }
  }, [user, emailVerificationPromptedUserId, dispatch]);

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
          const SCREEN_WIDTH = Dimensions.get('window').width;
          const CONTENT_WIDTH = 2000;
          const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
          horizontalScrollRef.current?.scrollTo({
            x: CENTER_X,
            y: 0,
            animated: false,
          });
        }, 0);
      } else if (turfViewPosition) {
        // Research and Investment Properties should restore their last position
        setTimeout(() => {
          horizontalScrollRef.current?.scrollTo({
            x: turfViewPosition.x,
            y: turfViewPosition.y,
            animated: false,
          });
        }, 0);
      }
    }
  }, [currentScreen, turfViewPosition]);

  const navigateToFloorPlan = useCallback((propertyId: number) => {
    // Capture current turf view position from the ref
    if (currentScrollPositionRef.current) {
      setTurfViewPosition(currentScrollPositionRef.current);
    }
    setCurrentPropertyId(propertyId);
    navigateToScreen('investmentProperty');
  }, [navigateToScreen]);

  const handleBattleEnd = useCallback(() => {
    navigateToScreen('hackRig');
  }, [dispatch, navigateToScreen]);

  const centerView = useCallback(() => {
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CONTENT_WIDTH = 2000;
    const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;

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
  }, [turfViewPosition, currentScreen]);

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
                horizontalScrollRef.current?.scrollTo({
                  x: turfViewPosition.x,
                  y: turfViewPosition.y,
                  animated: false,
                });
              }, 100); // Small delay to ensure screen transition completes
            }
          }}
        />;
      default:
        return (
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ErrorBoundary>
              <Balance />
            </ErrorBoundary>
            <View style={styles.scrollWrapper}>
              <ScrollViewMemo horizontalScrollRef={horizontalScrollRef} onScroll={handleTurfScroll}>
                <View style={[styles.scrollContent, { backgroundColor: colors.background, borderColor: colors.secondary + '99' }]}>
                  <DiagonalLines colors={colors} />
                  <View style={[styles.digitalGround, { backgroundColor: colors.matrix + '0D', borderColor: colors.matrix + '33' }]}>
                    <HomeLocation onPress={() => navigateToScreen('hackRig')} />
                    <DigitalBarracksLocation onPress={() => navigateToScreen('barracks')} />
                  </View>
                  <ResearchCenterLocation onNavigateToResearch={() => {
                    // Capture current turf view position before navigating
                    if (currentScrollPositionRef.current) {
                      setTurfViewPosition(currentScrollPositionRef.current);
                    }
                    navigateToScreen('research');
                  }} />
                  <DevelopmentZone buildingProperties={buildingProperties}>
                    {/* Property 2: Conditionally render based on Property 1's unlock status */}
                    {(() => {
                      return property1Unlocked ? (
                        <RentalHousingLocation 
                          propertyId={2}
                          onNavigateToRentalHousing={() => navigateToScreen('turf')}
                          onNavigateToFloorPlan={navigateToFloorPlan}
                          showTimer={false}
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
                    />

                    {/* Property 4: Conditionally render based on Properties 1, 2 & 3 being unlocked */}
                    {(() => {
                      return (property1Unlocked && property2Unlocked && property3Unlocked) ? (
                        <RentalHousingLocation 
                          propertyId={4}
                          onNavigateToRentalHousing={() => navigateToScreen('turf')}
                          onNavigateToFloorPlan={navigateToFloorPlan}
                          showTimer={false}
                        />
                      ) : (
                        <FutureBuildingPlaceholder propertyNumber={4} />
                      );
                    })()}
                  </DevelopmentZone>
                </View>
              </ScrollViewMemo>
            </View>
            <ProfileLocation onPress={() => navigateToScreen('profile')} />
          </View>
        );
    }
  }, [currentScreen, navigateToScreen, battleId, handleBattleEnd, colors, currentPropertyId, navigateToFloorPlan, previousScreen, turfViewPosition, property1Unlocked, property2Unlocked, property3Unlocked, handleTurfScroll, property4Status, buildingProperties, showOnboarding, handleOnboardingComplete, handleOnboardingSkip, showTurfIntro, handleTurfIntroComplete, handleTurfIntroSkip]);

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
