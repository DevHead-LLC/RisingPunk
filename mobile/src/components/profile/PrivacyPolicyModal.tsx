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
              Effective Date: August 30, 2025
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              1. Information We Collect
            </Text>
            
            <View style={[styles.infoItem, { backgroundColor: colors.background + '33' }]}>
              <Text style={[styles.infoLabel, { color: colors.text.primary }]}>
                Email address & username/handle:
              </Text>
              <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                Provided during account registration.
              </Text>
            </View>
            
            <View style={[styles.infoItem, { backgroundColor: colors.background + '33' }]}>
              <Text style={[styles.infoLabel, { color: colors.text.primary }]}>
                Password:
              </Text>
              <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                Stored as a bcrypt hash; we never keep raw passwords.
              </Text>
            </View>
            
            <View style={[styles.infoItem, { backgroundColor: colors.background + '33' }]}>
              <Text style={[styles.infoLabel, { color: colors.text.primary }]}>
                Usage data:
              </Text>
              <Text style={[styles.infoText, { color: colors.text.secondary }]}>
                Basic log data (e.g., IP address, device type) for security and analytics.
              </Text>
            </View>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We do not request real names, location data, contacts, camera, or microphone access.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              2. How We Use the Information
            </Text>
            
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Create and manage accounts, authenticate users, and operate core app features.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Communicate with users regarding updates or support requests.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Protect against fraud and misuse.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              3. Data Sharing
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We do not sell personal data.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Data may be shared with trusted service providers (hosting, analytics) solely to operate the service, under agreements requiring confidentiality and security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              4. Data Retention
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Personal data is kept while the account remains active.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Users can delete their data by deleting their account within the app or contacting us (support@risingpunk.com).
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Deleted accounts are permanently removed from our active databases within a reasonable time frame.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              5. Security
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Passwords are hashed with bcrypt.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We employ industry-standard measures (such as HTTPS) to protect data in transit and at rest.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              No method of transmission or storage is 100% secure, so we cannot guarantee absolute security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              6. Children's Privacy
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              RisingPunk is not directed to children under 13, and we do not knowingly collect data from them.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              If we learn that we have collected such data, we will delete it promptly.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              7. User Rights
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Users may request access, correction, or deletion of their data via in‑app settings or by contacting support@risingpunk.com.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              8. Changes to This Policy
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We may update this policy periodically. Material changes will be posted on this page with a new effective date.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              9. Contact Us
            </Text>
            
            <View style={[styles.contactInfo, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '33' }]}>
              <Text style={[styles.contactText, { color: colors.text.primary }]}>
                Questions or requests can be sent to:
              </Text>
              <Text style={[styles.contactEmail, { color: colors.primary }]}>
                support@risingpunk.com
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
});
