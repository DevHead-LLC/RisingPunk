import React, {useState, useRef, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, ScrollView} from 'react-native';
import {Balance} from '../components/common/Balance';
import {HomeScreen} from './HomeScreen';
import {DigitalBarracksScreen} from './DigitalBarracksScreen';
import {ProfileScreen} from './ProfileScreen';
import {HackMapScreen} from './HackMapScreen';
import {BotAssemblyScreen} from './BotAssemblyScreen';
import {useAuth} from '../context/AuthContext';
import {COLORS, SIZING} from '../styles/theme';
import {ProfileLocation} from '../components/turf/ProfileLocation';
import {HomeLocation} from '../components/turf/HomeLocation';
import {DigitalBarracksLocation} from '../components/turf/DigitalBarracksLocation';

export function TurfScreen(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState('turf');
  const {logout} = useAuth();
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);

  // Center the view whenever we return to turf screen
  useEffect(() => {
    if (currentScreen === 'turf') {
      // Center both scrollviews with a small delay to ensure proper rendering
      setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({
          x: 670, // Increased from 850 to 1000
          y: 0,
          animated: true
        });
        verticalScrollRef.current?.scrollTo({
          x: 0,
          y: 0, // Scroll to top since content is positioned there
          animated: true
        });
      }, 100);
    }
  }, [currentScreen]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'hackRig':
        return <HomeScreen 
          onClose={() => setCurrentScreen('turf')}
          onNavigateToMap={() => setCurrentScreen('map')}
          onNavigateToBotAssembly={() => setCurrentScreen('botAssembly')}
        />;
      case 'map':
        return <HackMapScreen onClose={() => setCurrentScreen('hackRig')} />;
      case 'botAssembly':
        return <BotAssemblyScreen onClose={() => setCurrentScreen('hackRig')} />;
      case 'barracks':
        return <DigitalBarracksScreen onClose={() => setCurrentScreen('turf')} />;
      case 'profile':
        return <ProfileScreen onClose={() => setCurrentScreen('turf')} />;
      default:
        return (
          <View style={styles.container}>
            <Balance />
            <View style={styles.scrollWrapper}>
              <ScrollView 
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentOffset={{ x: 670, y: 0 }}
                scrollEnabled={true}
                maximumZoomScale={1}
                minimumZoomScale={1}
                bounces={false}
                contentContainerStyle={{
                  width: 2000,
                  height: 2000,
                }}
              >
                <View style={styles.scrollContent}>
                  {/* Random diagonal lines */}
                  <View style={styles.line1} />
                  <View style={styles.line2} />
                  <View style={styles.line3} />
                  <View style={styles.thickLine1} />
                  <View style={styles.thickLine2} />
                  
                  <View style={styles.digitalGround}>
                    <HomeLocation onPress={() => setCurrentScreen('hackRig')} />
                    
                    <DigitalBarracksLocation onPress={() => setCurrentScreen('barracks')} />
                  </View>
                </View>
              </ScrollView>
            </View>

            <ProfileLocation onPress={() => setCurrentScreen('profile')} />
            
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <Text style={styles.logoutText}>DISCONNECT</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

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
  logoutButton: {
    position: 'absolute',
    bottom: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    backgroundColor: COLORS.accent,
    padding: SIZING.spacing.sm,
    borderRadius: 4,
    minWidth: 100,
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoutText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  digitalGround: {
    position: 'absolute',
    top: 100,
    left: '50%',
    transform: [{translateX: -300}],
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