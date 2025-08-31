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

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TermsOfServiceModal({
  visible,
  onClose,
}: TermsOfServiceModalProps) {
  const colors = useThemeColors();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Terms of Service
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
              Effective Date: August 30, 2025
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Acceptance of Terms
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Downloading or using RisingPunk constitutes agreement to these Terms and the Privacy Policy. If you do not agree, do not use the app.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Eligibility
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              You must be 16 years or older to create an account.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Account Registration and Security
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              • Provide a valid email and choose a handle.{'\n'}
              • You are responsible for safeguarding your password.{'\n'}
              • We may suspend or terminate accounts for violations or security concerns.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              User Conduct
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              You agree not to:{'\n'}
              • Engage in cheating, fraud, or exploitation of bugs.{'\n'}
              • Harass or impersonate others.{'\n'}
              • Use the service for illegal or unauthorized purposes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Intellectual Property
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              All content and code are owned by DevHead LLC. We grant you a limited, non‑transferable license for personal entertainment.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Purchases and Ads
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              The game currently contains no in‑app purchases or advertising. Terms will be updated if this changes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Suspension and Termination
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We may suspend or terminate accounts at our discretion. If this occurs, data associated with the account may be retained for 30 days to allow an appeal via support@risingpunk.com. After that period, data is deleted.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Dispute Resolution and Governing Law
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              • These Terms are governed by the laws of Arizona, USA.{'\n'}
              • Binding arbitration in Phoenix, AZ, under the American Arbitration Association rules resolves any dispute, except that claims under small‑claims court or injunctions for intellectual property may be brought in court.{'\n'}
              • You waive the right to participate in class actions or class‑wide arbitration.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Disclaimer of Warranties
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              The service is provided "as is" without warranties of any kind.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Limitation of Liability
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              To the maximum extent permitted by law, DevHead LLC is not liable for indirect, incidental, or consequential damages. Total liability will not exceed the amount you paid (if any) in the past 12 months.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Changes to Terms
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We may modify these Terms. Continued use after changes constitutes acceptance. Updates will be posted in‑app and/or via email.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Contact
            </Text>
            <View style={[styles.contactInfo, { backgroundColor: colors.matrix + '1A', borderColor: colors.matrix }]}>
              <Text style={[styles.contactText, { color: colors.text.primary }]}>
                <Text style={styles.boldText}>support@risingpunk.com</Text>
              </Text>
              <Text style={[styles.contactText, { color: colors.text.secondary }]}>
                DevHead LLC, 3801 E. Windsong Dr., Phoenix, AZ 85048, USA
              </Text>
            </View>
          </View>
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
    fontSize: SIZING.font.h3,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  paragraph: {
    fontSize: SIZING.font.body,
    lineHeight: SIZING.font.body + 4,
    marginBottom: SIZING.spacing.sm,
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
  boldText: {
    fontWeight: 'bold',
  },
});
