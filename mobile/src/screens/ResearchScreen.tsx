import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { useThemeColors } from '../hooks/useThemeColors';
import { ResearchDetailScreen } from '../components/research';
import { useResearchStatus } from '../hooks/useResearchStatus';
import { ResearchLockedModal } from '../components/research/ResearchLockedModal';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getCurrentBalance, updateBalance } from '../store/slices/balanceSlice';
import { useResearchFeatures } from '../hooks/useResearchFeatures';
import { useFetchBalanceQuery } from '../store/api/balanceApi';
import { getMockResearchFeatures } from '../config/mockResearchFeatures';

type ResearchScreenProps = {
  onClose: () => void;
};

type ResearchCard = {
  id: string;
  name: string;
  image: any;
};

const RESEARCH_CARDS: ResearchCard[] = [
  { id: 'home-defense', name: 'Home Defense', image: require('../assets/images/homeDefenseResearch.png') },
  { id: 'hack-ability', name: 'Hack Ability', image: require('../assets/images/hackerResearch.png') },
  { id: 'financial', name: 'Financial', image: require('../assets/images/financialResearchMale.png') },
  { id: 'hack-crew', name: 'Hack Crew', image: require('../assets/images/hackCrewResearch.png') },
  { id: 'npc', name: 'NPC', image: require('../assets/images/npcResearch.png') },
  { id: 'cash-flow', name: 'Cash Flow', image: require('../assets/images/cashFlowResearch.png') },
  { id: 'construction', name: 'Construction', image: require('../assets/images/constructionResearch.png') },
  { id: 'battle-mechanics', name: 'Battle Mechanics', image: require('../assets/images/battleMechanicsResearch.png') },
  { id: 'gear', name: 'Gear', image: require('../assets/images/hackerGearResearch.png') },
  { id: 'investments', name: 'Investments', image: require('../assets/images/investmentResearch.png') },
];

const { width: screenWidth } = Dimensions.get('window');
const cardSize = Math.min((screenWidth - SIZING.spacing.md * 3) / 2, 160);
const cardSpacing = SIZING.spacing.md;

export function ResearchScreen({ onClose }: ResearchScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const [currentScreen, setCurrentScreen] = useState<'main' | string>('main');
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [selectedResearch, setSelectedResearch] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const { researchStatus, loading, error, canAccessResearch, getResearchRequirements, refreshAfterUnlock } = useResearchStatus();
  const userLevel = useAppSelector(state => state.auth.user?.level || 1);
  const userBalance = useAppSelector(state => getCurrentBalance(state));
  
  const styles = createStyles(colors);
  
  const handleCardPress = (cardId: string) => {
    if (canAccessResearch(cardId)) {
      setCurrentScreen(cardId);
    } else {
      setSelectedResearch(cardId);
      setShowLockedModal(true);
    }
  };
  
  const handleBack = () => {
    setCurrentScreen('main');
  };
  
  const renderResearchCard = (card: ResearchCard) => {
    const isUnlocked = canAccessResearch(card.id);
    
    return (
      <TouchableOpacity
        key={card.id}
        style={styles.card}
        onPress={() => handleCardPress(card.id)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image source={card.image} style={styles.cardImage} />
          {!isUnlocked && (
            <View style={styles.lockOverlay}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardName}>{card.name}</Text>
      </TouchableOpacity>
    );
  };
  
  const renderMainScreen = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Research</Text>
        <CloseButton onPress={onClose} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsGrid}>
          {RESEARCH_CARDS.map(renderResearchCard)}
        </View>
      </ScrollView>
    </>
  );
  
  const renderDetailScreen = () => {
    const selectedCard = RESEARCH_CARDS.find(card => card.id === currentScreen);
    if (!selectedCard) return renderMainScreen();
    
    // Use mock data for now
    const features = getMockResearchFeatures(selectedCard.id);
    
    const handleFeatureUnlock = async (featureId: string, cost: number): Promise<boolean> => {
      // Mock implementation - just return success for now
      console.log(`Mock unlock: ${featureId} for $${cost}`);
      return true;
    };
    
    return (
      <ResearchDetailScreen
        title={selectedCard.name}
        onBack={handleBack}
        onClose={onClose}
        features={features}
        currentLevel={userLevel}
        currentBalance={userBalance}
        onFeatureUnlock={handleFeatureUnlock}
      />
    );
  };
  
  const handleCloseLockedModal = () => {
    setShowLockedModal(false);
    setSelectedResearch(null);
  };



  const handleUnlockSuccess = (newBalance: number) => {
    setShowLockedModal(false);
    setSelectedResearch(null);
    
    // Update balance in Redux store
    dispatch(updateBalance({
      total: newBalance,
      ratePerSecond: 1, // Keep existing rate
      lastUpdated: new Date().toISOString(),
    }));
    
    // Refresh research status
    refreshAfterUnlock();
  };

  const requirements = selectedResearch ? getResearchRequirements(selectedResearch) : null;
  
  return (
    <SafeAreaView style={styles.container}>
      {currentScreen === 'main' ? renderMainScreen() : renderDetailScreen()}
      
      <ResearchLockedModal
        visible={showLockedModal}
        onClose={handleCloseLockedModal}
        onUnlockSuccess={handleUnlockSuccess}
        requirements={requirements}
        currentLevel={userLevel}
        currentBalance={userBalance}
        researchStatus={researchStatus}
      />
      
      {/* ResearchUnlockModal is removed */}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZING.spacing.md,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: cardSpacing,
  },
  card: {
    width: cardSize,
    height: cardSize,
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZING.spacing.xs,
    width: cardSize * 0.6,
    height: cardSize * 0.6,
  },
  cardImage: {
    width: cardSize * 0.6,
    height: cardSize * 0.6,
    resizeMode: 'contain',
  },
  cardName: {
    color: colors.text.primary,
    fontSize: SIZING.font.small,
    fontWeight: '500',
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(128, 128, 128, 0.8)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  lockIcon: {
    fontSize: 32,
    color: '#FFD700',
  },
});
