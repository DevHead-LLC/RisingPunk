import React, {memo, useRef, useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, Dimensions, Text, TouchableOpacity} from 'react-native';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { HackRigDisplay } from '../components/home/HackRigDisplay';
import { BotAssembly } from '../components/home/BotAssembly';
import { HomeFloorPlan } from '../components/home/HomeFloorPlan';
import { useThemeColors } from '../hooks/useThemeColors';

type TabType = 'floorPlan' | 'garage';

type HomeScreenProps = {
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToBotAssembly: () => void;
  onNavigateToBattle: () => void;
};

export const HomeScreen = memo(function HomeScreen({
  onClose,
  onNavigateToMap,
  onNavigateToBotAssembly,
  onNavigateToBattle,
}: HomeScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const [activeTab, setActiveTab] = useState<TabType>('floorPlan');
  const scrollViewRef = useRef<ScrollView>(null);
  const garageScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Center the view on the floor plan when first loaded
    const screenWidth = Dimensions.get('window').width;
    const floorPlanWidth = 1200;
    const centerX = (floorPlanWidth - screenWidth) / 2;
    const centerY = 0;
    
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: centerX,
        y: centerY,
        animated: false,
      });
    }, 100);
  }, []);

  useEffect(() => {
    // Center the garage view when garage tab is selected
    if (activeTab === 'garage') {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      const garageWidth = 1200;
      const garageHeight = 900;
      const centerX = (garageWidth - screenWidth) / 2;
      const centerY = (garageHeight - screenHeight) / 2;
      
      setTimeout(() => {
        garageScrollViewRef.current?.scrollTo({
          x: centerX,
          y: centerY,
          animated: false,
        });
      }, 100);
    }
  }, [activeTab]);

  const renderFloorPlan = () => (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.scrollView}
      directionalLockEnabled={false}
      alwaysBounceHorizontal={true}
      alwaysBounceVertical={true}
    >
      <View style={[styles.floorPlanContainer, { borderColor: colors.matrix }]}>
        <HomeFloorPlan
          onHackRigPress={onNavigateToMap}
          onNavigateToBattle={onNavigateToBattle}
        />
        {/* Place HackRig in the bedroom section */}
        <View style={styles.hackRigContainer}>
          <HackRigDisplay
            onPress={onNavigateToMap}
            onNavigateToBattle={onNavigateToBattle}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderGarage = () => (
    <ScrollView
      ref={garageScrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.garageScrollContent}
      style={styles.scrollView}
      directionalLockEnabled={false}
      alwaysBounceHorizontal={true}
      alwaysBounceVertical={true}
    >
      <View style={[styles.garageContainer, { borderColor: colors.matrix }]}>
        <View style={styles.botAssemblyContainer}>
          <BotAssembly onPress={onNavigateToBotAssembly} />
        </View>
      </View>
    </ScrollView>
  );

  const TabButton = ({ label, tab, isActive }: { label: string; tab: TabType; isActive: boolean }) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CloseButton onPress={onClose} />
      
      {/* Fixed pill at top center of screen */}
      <View style={styles.fixedHomePillWrapper}>
        <View style={[styles.fixedHomePill, { backgroundColor: '#2E7D32' }]}>
          <Text style={styles.fixedHomeText}>{activeTab === 'floorPlan' ? 'Main Floor' : 'Garage'}</Text>
        </View>
      </View>
      
      {/* Content based on active tab */}
      {activeTab === 'floorPlan' ? renderFloorPlan() : renderGarage()}
      
      {/* Tab Navigation - Fixed at bottom */}
      <View style={styles.tabContainer}>
        <TabButton label="Main Floor" tab="floorPlan" isActive={activeTab === 'floorPlan'} />
        <TabButton label="Garage" tab="garage" isActive={activeTab === 'garage'} />
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    width: 1250,
    height: 950,
  },
  garageScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 1200,
    height: 900,
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
});
