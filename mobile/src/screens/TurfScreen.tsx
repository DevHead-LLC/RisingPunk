import React, {memo, useState} from 'react';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import {Balance} from '../components/common/Balance';
import {HomeScreen} from './HomeScreen';
import {DigitalBarracksScreen} from './DigitalBarracksScreen';
import {ProfileScreen} from './ProfileScreen';
import {HackMapScreen} from './HackMapScreen';
import {BotAssemblyScreen} from './BotAssemblyScreen';

const ProfileSection = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.profileContainer} onPress={onPress}>
    <View style={styles.profileDiamond}>
      <Text style={styles.profileText}>Profile</Text>
    </View>
  </TouchableOpacity>
));

const SquareButton = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.homeSquare} onPress={onPress}>
    <Text style={styles.homeText}>home</Text>
  </TouchableOpacity>
));

const DigitalBarracks = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.barracksCircle} onPress={onPress}>
    <Text style={styles.barracksText}>Digital Barracks</Text>
  </TouchableOpacity>
));

export function TurfScreen(): React.JSX.Element {
  const [currentScreen, setCurrentScreen] = useState('turf');

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
            <Balance style={styles.balance} />
            <View style={styles.content}>
              <View style={styles.topRow}>
                <DigitalBarracks 
                  onPress={() => setCurrentScreen('barracks')} 
                />
                <SquareButton 
                  onPress={() => setCurrentScreen('hackRig')} 
                />
              </View>
              <ProfileSection 
                onPress={() => setCurrentScreen('profile')} 
              />
            </View>
          </View>
        );
    }
  };

  return renderScreen();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 60,
  },
  balance: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  barracksCircle: {
    width: 120,
    height: 120,
    backgroundColor: '#4a90e2',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barracksText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  homeSquare: {
    width: 100,
    height: 100,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  homeText: {
    fontSize: 16,
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDiamond: {
    width: 100,
    height: 100,
    backgroundColor: '#2ecc71',
    transform: [{rotate: '45deg'}],
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#fff',
    fontSize: 16,
    transform: [{rotate: '-45deg'}],
    textAlign: 'center',
  },
}); 