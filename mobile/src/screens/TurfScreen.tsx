import React, {memo, useState, useRef, useEffect} from 'react';
import {View, StyleSheet, TouchableOpacity, Text, Image, ScrollView} from 'react-native';
import {Balance} from '../components/common/Balance';
import {HomeScreen} from './HomeScreen';
import {DigitalBarracksScreen} from './DigitalBarracksScreen';
import {ProfileScreen} from './ProfileScreen';
import {HackMapScreen} from './HackMapScreen';
import {BotAssemblyScreen} from './BotAssemblyScreen';
import {useAuth} from '../context/AuthContext';
import {COLORS, SIZING} from '../styles/theme';

console.log('Home image:', require('../assets/images/home.png'));
console.log('Barracks image:', require('../assets/images/digital-barracks.png'));
console.log('Profile image:', require('../assets/images/profile.png'));

const TurfLocation = memo(({ 
  onPress, 
  icon, 
  label, 
  style,
  isProfile 
}: { 
  onPress: () => void;
  icon: any;
  label: string;
  style?: object;
  isProfile?: boolean;
}) => (
  <TouchableOpacity 
    style={[styles.location, style]} 
    onPress={onPress}
  >
    <View style={isProfile ? styles.profileContainer : styles.iconContainer}>
      <Image 
        source={icon}
        style={styles.locationIcon}
      />
    </View>
    <Text style={isProfile ? styles.profileLabel : styles.locationLabel}>
      {label}
    </Text>
  </TouchableOpacity>
));

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
                ref={horizontalScrollRef}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: 1000, y: 0 }}
              >
                <ScrollView 
                  ref={verticalScrollRef}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                  contentOffset={{ x: 0, y: 0 }}
                >
                  <View style={styles.scrollContent}>
                    {/* Main grid background */}
                    <View style={styles.gridBackground} />
                    
                    {/* Locations container */}
                    <View style={styles.digitalGround}>
                      <TurfLocation
                        icon={require('../assets/images/home.png')}
                        label="HOME"
                        onPress={() => setCurrentScreen('hackRig')}
                        style={styles.homePosition}
                      />
                      
                      <TurfLocation
                        icon={require('../assets/images/digital-barracks.png')}
                        label="DIGITAL BARRACKS"
                        onPress={() => setCurrentScreen('barracks')}
                        style={styles.barracksPosition}
                      />
                    </View>
                  </View>
                </ScrollView>
              </ScrollView>
            </View>

            <TurfLocation
              icon={require('../assets/images/profile.png')}
              label="PROFILE"
              onPress={() => setCurrentScreen('profile')}
              style={styles.profilePosition}
              isProfile={true}
            />
            
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
  location: {
    position: 'absolute',
    alignItems: 'center',
    padding: SIZING.spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 3,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.matrix,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  locationIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  locationLabel: {
    color: COLORS.secondary,
    fontSize: SIZING.font.body,
    letterSpacing: 2,
    textAlign: 'center',
    position: 'absolute',
    top: '100%',
    marginTop: 20,
    width: 200,
    left: -40,
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
  profileContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  profileIcon: {
    width: 40,
    height: 40,
  },
  profilePosition: {
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 4,
    padding: SIZING.spacing.xs,
  },
  profileLabel: {
    color: COLORS.primary,
    fontSize: SIZING.font.small,
    letterSpacing: 1,
    position: 'absolute',
    bottom: -30,
    width: 80,
    textAlign: 'center',
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
}); 