import React, {memo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import { COLORS, SIZING } from '../styles/theme';

const HackRigDisplay = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.moduleContainer} onPress={onPress}>
    <View style={styles.imageContainer}>
      <Image 
        source={require('../assets/images/hacker-rig.png')}
        style={styles.moduleImage}
      />
    </View>
    <View style={styles.moduleTextContainer}>
      <Text style={styles.moduleTitle}>HACK RIG</Text>
      <Text style={styles.moduleDescription}>Access the network</Text>
    </View>
  </TouchableOpacity>
));

const BotAssembly = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.moduleContainer} onPress={onPress}>
    <View style={styles.imageContainer}>
      <Image 
        source={require('../assets/images/bot-making.png')}
        style={styles.moduleImage}
      />
    </View>
    <View style={styles.moduleTextContainer}>
      <Text style={styles.moduleTitle}>BOT ASSEMBLY</Text>
      <Text style={styles.moduleDescription}>Build your army</Text>
    </View>
  </TouchableOpacity>
));

export function HomeScreen({ 
  onNavigateToMap, 
  onClose,
  onNavigateToBotAssembly 
}: { 
  onNavigateToMap: () => void;
  onClose: () => void;
  onNavigateToBotAssembly: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onClose}>
        <Text style={styles.backButtonText}>×</Text>
      </TouchableOpacity>
      
      <View style={styles.content}>
        <View style={styles.modulesGrid}>
          <HackRigDisplay onPress={onNavigateToMap} />
          <BotAssembly onPress={onNavigateToBotAssembly} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: SIZING.spacing.lg,
  },
  modulesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SIZING.spacing.lg,
  },
  moduleContainer: {
    width: '45%',
    aspectRatio: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.9)',
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    marginBottom: SIZING.spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.matrix,
    padding: SIZING.spacing.xs,
  },
  moduleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  moduleTextContainer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  moduleTitle: {
    color: '#b39ddb',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  moduleDescription: {
    color: '#9C27B0',
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  backButton: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    right: SIZING.spacing.lg,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#b39ddb',
    borderWidth: 2,
    borderColor: COLORS.secondary,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 28,
    color: COLORS.background,
    marginTop: -2,
  },
}); 