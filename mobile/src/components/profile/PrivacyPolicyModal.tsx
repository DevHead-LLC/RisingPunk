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
              Effective Date: August 30, 2025
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Data Controller
            </Text>
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              DevHead LLC{'\n'}
              3801 E. Windsong Dr., Phoenix, AZ 85048, USA{'\n'}
              support@risingpunk.com (forwarded and hosted through Google Workspace)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Information We Collect
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Email address</Text> – required to create and manage the account. Email addresses are verified through a secure verification process to ensure account security and enable password recovery.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Email verification status</Text> – we track whether your email has been verified to provide appropriate account security features.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Handle/username</Text> – chosen by you for in‑game display.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Password</Text> – stored only as a bcrypt hash.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Server logs</Text> – IP address, device ID, and usage data retained for 30 days to detect fraud and maintain security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Legal Bases
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Performance of a contract</Text> – operating and maintaining your game account.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Legitimate interests</Text> – securing the service and preventing fraud.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              How We Use Information
            </Text>
            
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Authenticate and manage accounts.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Send essential service messages or support replies.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Send email verification links and password recovery emails.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Protect the service against fraud or abuse.
              </Text>
            </View>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We do not sell personal data.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Email Verification and Account Security
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Email verification is required</Text> for account security and password recovery. Unverified accounts may be subject to the following limitations:
            </Text>
            
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Password recovery may not be available for unverified accounts.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Unverified accounts that become locked may be unrecoverable and subject to deletion.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • We will attempt to notify users of verification requirements through in-app notifications.
              </Text>
            </View>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Verification emails</Text> contain secure tokens that expire within 72 hours. You can request new verification emails as needed from your account settings.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Third‑Party Processors
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Amazon Web Services (Elastic Beanstalk/EC2)</Text> – application hosting (USA).
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>MongoDB Atlas</Text> – database hosting (USA clusters).
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Apple</Text> – app distribution and optional diagnostic data under Apple's own policy.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Google Workspace</Text> – handles support@risingpunk.com email forwarding.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Each processor operates under a written data‑processing agreement.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              International Data Transfers
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Data is stored on servers in the United States. For EU/UK users, transfers rely on Standard Contractual Clauses or equivalent lawful mechanisms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Data Retention
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Active accounts:</Text> retained until you delete or remain inactive for 12 months, after which they are scheduled for deletion.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>User‑initiated deletion:</Text> removed immediately from active systems and purged from backups within 30 days.
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              <Text style={styles.boldText}>Server logs:</Text> automatically deleted after 30 days.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Your Rights
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Contact support@risingpunk.com to:
            </Text>
            
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Access a copy of your email and handle.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Rectify or update them.
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Delete your account (or request restriction/objection).
              </Text>
              <Text style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • Receive data in a portable format (JSON/CSV).
              </Text>
            </View>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              We respond within one month. EU/UK users may lodge a complaint with a supervisory authority (e.g., the ICO).
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Security
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Passwords are hashed; email addresses are encrypted at rest. We use HTTPS/TLS and role‑based access controls, but no method is 100% secure.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Data Breach Response
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              On discovering a personal‑data breach, we will notify affected users and regulators within 72 hours, outlining the incident and remedial steps.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Children's Privacy
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              RisingPunk is intended for users 16+. We do not knowingly collect data from younger children; any such data will be deleted.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Changes to This Policy
            </Text>
            
            <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
              Material updates will be posted in‑app and/or via email with a revised effective date.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Contact
            </Text>
            
            <View style={[styles.contactInfo, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '33' }]}>
              <Text style={[styles.contactText, { color: colors.text.primary }]}>
                support@risingpunk.com
              </Text>
              <Text style={[styles.contactEmail, { color: colors.primary }]}>
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
