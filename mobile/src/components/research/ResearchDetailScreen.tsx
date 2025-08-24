import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { CustomButton } from '../common/CustomButton';

type ResearchDetailScreenProps = {
  title: string;
  onBack: () => void;
  onClose: () => void;
  children?: React.ReactNode;
};

export function ResearchDetailScreen({ title, onBack, onClose, children }: ResearchDetailScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  
  const styles = createStyles(colors);
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <CustomButton
          title="← Back"
          onPress={onBack}
          style={styles.backButton}
        />
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children || (
          <View style={styles.content}>
            <Text style={styles.placeholderText}>Research content for {title} will be implemented here.</Text>
          </View>
        )}
      </ScrollView>
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
  backButton: {
    backgroundColor: colors.accent,
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: SIZING.spacing.sm,
    paddingVertical: SIZING.spacing.xs,
    minWidth: 80,
    borderRadius: 4,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 2,
    borderRadius: 22,
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 28,
    marginTop: -2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZING.spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZING.spacing.lg,
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
  },
});
