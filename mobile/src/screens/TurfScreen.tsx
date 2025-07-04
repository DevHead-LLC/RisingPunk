import React, {useState, useRef, useEffect, useCallback, memo} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, ScrollView, Dimensions} from 'react-native';
import {Balance} from '../components/common/Balance';
import {HomeScreen} from './HomeScreen';
import {DigitalBarracksScreen} from './DigitalBarracksScreen';
import {ProfileScreen} from './ProfileScreen';
import {HackMapScreen} from './HackMapScreen';
import {BotAssemblyScreen} from './BotAssemblyScreen';
import { useAppDispatch } from '../store/hooks';
import {COLORS, SIZING} from '../styles/theme';
import {ProfileLocation} from '../components/turf/ProfileLocation';
import {HomeLocation} from '../components/turf/HomeLocation';
import {DigitalBarracksLocation} from '../components/turf/DigitalBarracksLocation';
import {BattlePreparationScreen} from './BattlePreparationScreen';
import {BattleGridScreen} from './BattleGridScreen';
import {ErrorBoundary} from '../components/common/ErrorBoundary';

const DiagonalLines = memo(() => (
  <>
    <View style={styles.line1} />
    <View style={styles.line2} />
    <View style={styles.line3} />
    <View style={styles.thickLine1} />
    <View style={styles.thickLine2} />
  </>
));

const ScrollViewMemo = memo(function ScrollViewMemo({
  children,
  horizontalScrollRef
}: {
  children: React.ReactNode;
  horizontalScrollRef: React.RefObject<ScrollView>;
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
      contentContainerStyle={{
        width: 2000,
        height: 2000,
      }}
    >
      {children}
    </ScrollView>
  );
});

export function TurfScreen(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState('turf');
  const dispatch = useAppDispatch();
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);

  const navigateToScreen = useCallback((screen: string) => {
    setCurrentScreen(screen);
  }, []);

  const centerView = useCallback(() => {
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const CONTENT_WIDTH = 2000;
    const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
    
    // Set initial scroll position without animation
    horizontalScrollRef.current?.scrollTo({
      x: CENTER_X,
      y: 0,
      animated: false
    });
  }, []);

  useEffect(() => {
    // Center the view immediately when the screen mounts
    centerView();
  }, []); // Empty dependency array for mount-only execution

  const renderScreen = useCallback(() => {
    switch (currentScreen) {
      case 'hackRig':
        return <HomeScreen 
          onClose={() => navigateToScreen('turf')}
          onNavigateToMap={() => navigateToScreen('map')}
          onNavigateToBotAssembly={() => navigateToScreen('botAssembly')}
          onNavigateToBattle={() => navigateToScreen('battlePrep')}
        />;
      case 'battlePrep':
        return <BattlePreparationScreen 
          onClose={() => {
            navigateToScreen('turf');
            setTimeout(() => navigateToScreen('hackRig'), 0);
          }}
          onBattleStart={() => navigateToScreen('battle')}
        />;
      case 'map':
        return <HackMapScreen onClose={() => navigateToScreen('hackRig')} />;
      case 'botAssembly':
        return <BotAssemblyScreen onClose={() => navigateToScreen('hackRig')} />;
      case 'barracks':
        return <DigitalBarracksScreen onClose={() => navigateToScreen('turf')} />;
      case 'profile':
        return <ProfileScreen onClose={() => navigateToScreen('turf')} />;
      case 'battle':
        return <BattleGridScreen onClose={() => {
          navigateToScreen('turf');
          setTimeout(() => navigateToScreen('hackRig'), 0);
        }} />;
      default:
        return (
          <View style={styles.container}>
            <ErrorBoundary>
              <Balance />
            </ErrorBoundary>
            <View style={styles.scrollWrapper}>
              <ScrollViewMemo horizontalScrollRef={horizontalScrollRef}>
                <View style={styles.scrollContent}>
                  <DiagonalLines />
                  <View style={styles.digitalGround}>
                    <HomeLocation onPress={() => navigateToScreen('hackRig')} />
                    <DigitalBarracksLocation onPress={() => navigateToScreen('barracks')} />
                  </View>
                </View>
              </ScrollViewMemo>
            </View>
            <ProfileLocation onPress={() => navigateToScreen('profile')} />
          </View>
        );
    }
  }, [currentScreen, navigateToScreen]);

  return renderScreen();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: 'rgba(0, 255, 65, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.2)',
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
    backgroundColor: COLORS.background,
    borderWidth: 3,
    borderColor: 'rgba(71, 23, 246, 0.6)',
    borderRadius: 8,
  },
  gridBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: COLORS.matrix,
    opacity: 0.1,
  },
  line1: {
    position: 'absolute',
    width: '200%',
    height: 1,
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
    transform: [{ rotate: '45deg' }],
    top: '20%',
    left: '-50%',
  },
  line2: {
    position: 'absolute',
    width: '200%',
    height: 1,
    backgroundColor: 'rgba(0, 255, 65, 0.08)',
    transform: [{ rotate: '-30deg' }],
    top: '40%',
    left: '-50%',
  },
  line3: {
    position: 'absolute',
    width: '200%',
    height: 1,
    backgroundColor: 'rgba(0, 255, 65, 0.12)',
    transform: [{ rotate: '15deg' }],
    top: '60%',
    left: '-50%',
  },
  thickLine1: {
    position: 'absolute',
    width: '200%',
    height: 3,
    backgroundColor: 'rgba(0, 255, 65, 0.05)',
    transform: [{ rotate: '-60deg' }],
    top: '30%',
    left: '-50%',
  },
  thickLine2: {
    position: 'absolute',
    width: '200%',
    height: 4,
    backgroundColor: 'rgba(0, 255, 65, 0.03)',
    transform: [{ rotate: '75deg' }],
    top: '70%',
    left: '-50%',
  },
}); 