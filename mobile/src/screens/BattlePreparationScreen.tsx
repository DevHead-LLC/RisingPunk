import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { COLORS, SIZING } from '../styles/theme';
import { CloseButton } from '../components/common/CloseButton';
import { BattalionSlot } from '../components/battle/BattalionSlot';
import { CircleSlot } from '../components/battle/CircleSlot';

type Props = {
  onClose: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const BattlePreparationScreen = React.memo(({ onClose }: Props) => {
  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      
      <View style={styles.fixedHeader}>
        <Text style={styles.title}>BATTLE PREPARATION</Text>
      </View>

      <ScrollView 
        horizontal 
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.screen}>
          <Text style={styles.subtitle}>[USER FORCES]</Text>
          <View style={styles.battalionsContainer}>
            <View style={styles.battalionColumn}>
              <BattalionSlot name="E" isLocked />
              <BattalionSlot name="F" isLocked />
            </View>
            <View style={styles.battalionColumn}>
              <BattalionSlot name="C" isLocked />
              <BattalionSlot name="D" isLocked />
            </View>
            <View style={styles.battalionColumn}>
              <BattalionSlot name="A" />
              <BattalionSlot name="B" />
            </View>
            <View style={styles.circleColumn}>
              <CircleSlot />
              <CircleSlot />
              <CircleSlot />
            </View>
          </View>
        </View>
        <View style={styles.screen}>
          <View style={styles.enemyForces} />
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.executeButton}
        onPress={() => console.log('Execute battle')}
      >
        <Text style={styles.executeText}>EXECUTE BATTLE SEQUENCE</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  fixedHeader: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: 40,
  },
  screen: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    paddingTop: SIZING.spacing.lg,
  },
  title: {
    color: '#4717F6',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#00FF41',
    fontSize: 24,
    textAlign: 'center'
  },
  battalionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
    gap: SIZING.spacing.lg,
  },
  battalionColumn: {
    gap: SIZING.spacing.md,
  },
  circleColumn: {
    marginLeft: SIZING.spacing.lg,
    justifyContent: 'flex-start', // Align circles from top
    gap: SIZING.spacing.md,
    paddingTop: 4, // Fine-tune vertical alignment with battalions
  },
  enemyForces: {
    flex: 1,
  },
  executeButton: {
    marginHorizontal: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.sm,
    height: 50,
    backgroundColor: 'rgba(71, 23, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#4717F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  executeText: {
    color: '#4717F6',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(71, 23, 246, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
}); 