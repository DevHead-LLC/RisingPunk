import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { SIZING } from '../../styles/theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { renderPrivacyPolicySections, getPrivacyPolicyEffectiveDate } from '../../utils/documentRenderers';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({
  visible,
  onClose,
}: PrivacyPolicyModalProps) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Privacy Policy
          </Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Effective Date: {getPrivacyPolicyEffectiveDate()}
            </Text>
          </View>

          {renderPrivacyPolicySections(colors)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#33333333',
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZING.spacing.md,
  },
  section: {
    marginBottom: SIZING.spacing.lg,
  },
  sectionTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  infoItem: {
    padding: SIZING.spacing.sm,
    borderRadius: 8,
    marginBottom: SIZING.spacing.sm,
  },
  infoLabel: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  infoText: {
    fontSize: SIZING.font.body,
    lineHeight: SIZING.font.body + 4,
  },
  paragraph: {
    fontSize: SIZING.font.body,
    lineHeight: SIZING.font.body + 4,
    marginBottom: SIZING.spacing.sm,
  },
  bulletList: {
    marginLeft: SIZING.spacing.sm,
  },
  bulletItem: {
    fontSize: SIZING.font.body,
    lineHeight: SIZING.font.body + 4,
    marginBottom: SIZING.spacing.xs,
  },
  contactInfo: {
    padding: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  contactText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  contactEmail: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  boldText: {
    fontWeight: 'bold',
  },
});
