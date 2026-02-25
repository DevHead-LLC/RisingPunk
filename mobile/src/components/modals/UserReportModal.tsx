import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  FlatList,
  BackHandler,
} from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useSubmitReportMutation } from '../../store/api/reportsApi';
import type { ReportContext, ReportReason } from '../../types/reports';

// Re-export types for backward compatibility (if other files import from here)
export type { ReportContext, ReportReason };

export interface UserReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;        // User ID of the reported user (critical for tracking)
  reportedUsername: string;      // Current username of reported user
  reportingUserId: string;       // User ID of the reporting user
  reportingUsername: string;     // Username of reporting user
  context: ReportContext;        // Context of the report
  contextData?: any;             // Additional context-specific data (e.g., message content, rule text)
  maxDescriptionLength?: number; // Max characters for description (default 200, can be 1000 for other plans)
  renderAsOverlay?: boolean;     // If true, renders as View overlay instead of Modal (for use inside other modals)
}

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'vulgar', label: 'Vulgar/Profanity' },
  { value: 'hate-speech', label: 'Hate Speech' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

const CONTEXT_LABELS: Record<ReportContext, string> = {
  'username': 'Username',
  'crew-name': 'Crew Name',
  'crew-identifier': 'Crew Identifier',
  'internal-message-board': 'Internal Message Board',
  'external-message-board': 'External Message Board',
  'crew-rules': 'Crew Rules',
  'chat-message': 'Chat Message',
  'map-chat-message': 'Map Chat Message',
  'private-message': 'Private Message',
};

export const UserReportModal: React.FC<UserReportModalProps> = ({
  visible,
  onClose,
  reportedUserId,
  reportedUsername,
  reportingUserId,
  reportingUsername,
  context,
  contextData,
  maxDescriptionLength = 200,
  renderAsOverlay = false,
}) => {
  const colors = useThemeColors();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  
  const [submitReport, { isLoading: isSubmitting }] = useSubmitReportMutation();

  const isSubmittingFinal = isSubmitting || isSubmittingLocal;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setSelectedReason(null);
      setDescription('');
      setError('');
      setShowReasonPicker(false);
      setIsSubmittingLocal(false);
    }
  }, [visible]);

  // Handle Android back button when picker is open
  useEffect(() => {
    if (Platform.OS === 'android' && visible && showReasonPicker) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        setShowReasonPicker(false);
        return true;
      });

      return () => backHandler.remove();
    }
  }, [visible, showReasonPicker]);

  // Handle Modal's onRequestClose (Android back button)
  const handleRequestClose = useCallback(() => {
    if (showReasonPicker) {
      setShowReasonPicker(false);
    } else {
      onClose();
    }
  }, [showReasonPicker, onClose]);

  const getContextDataDisplay = (): string => {
    if (!contextData) return '';
    
    switch (context) {
      case 'chat-message':
      case 'map-chat-message':
      case 'private-message':
        return contextData.message || '';
      case 'internal-message-board':
      case 'external-message-board':
        return contextData.message || '';
      case 'crew-rules':
        return contextData.ruleText || '';
      case 'username':
        return contextData.username || reportedUsername;
      case 'crew-name':
        const name = contextData.crewName || '';
        const identifier = contextData.crewIdentifier || '';
        return identifier ? `${name} (${identifier})` : name;
      case 'crew-identifier':
        return contextData.crewIdentifier || '';
      default:
        return '';
    }
  };

  const handleSubmit = useCallback(async () => {
    if (isSubmittingFinal) {
      return;
    }

    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description');
      return;
    }

    if (description.length > maxDescriptionLength) {
      setError(`Description must be ${maxDescriptionLength} characters or less`);
      return;
    }

    if (!reportingUserId || !reportedUserId) {
      setError('Missing user information. Please try again.');
      return;
    }

    if (String(reportingUserId).trim() === String(reportedUserId).trim()) {
      setError('You cannot report yourself.');
      return;
    }

    setError('');
    setIsSubmittingLocal(true);

    try {
      await submitReport({
        reportedUserId,
        reportedUsername,
        reportingUserId,
        reportingUsername,
        reason: selectedReason,
        description: description.trim(),
        context,
        contextData,
      }).unwrap();

      setIsSubmittingLocal(false);
      onClose();
    } catch (err: any) {
      setIsSubmittingLocal(false);
      setError(err?.data?.error || err?.message || 'Failed to submit report. Please try again.');
    }
  }, [selectedReason, description, maxDescriptionLength, reportedUserId, reportedUsername, reportingUserId, reportingUsername, context, contextData, submitReport, onClose, isSubmittingFinal]);

  const isFormValid = selectedReason !== null && description.trim().length > 0 && description.length <= maxDescriptionLength && !isSubmittingFinal;
  const contextDataDisplay = getContextDataDisplay();
  const placeholder = maxDescriptionLength === 200 
    ? 'Provide short description of report purpose'
    : 'Provide description of what went wrong';

  const modalContent = (
    <View>
      <Text style={[styles.title, { color: colors.primary }]}>
        REPORT USER
      </Text>

      {/* Report Details (Read-only) */}
      <View style={[styles.section, { borderColor: colors.secondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
          Report Details
        </Text>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
            Reported User:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>
            {reportedUsername}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
            Reporting User:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>
            {reportingUsername}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
            Context:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>
            {CONTEXT_LABELS[context]}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>
            Timestamp:
          </Text>
          <Text style={[styles.detailValue, { color: colors.text.primary }]}>
            {new Date().toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Context-Specific Data Display */}
      {contextDataDisplay && (
        <View style={[styles.section, { borderColor: colors.secondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
            Content Being Reported
          </Text>
          <View style={[styles.contextDataContainer, { backgroundColor: colors.surface, borderColor: colors.secondary }]}>
            <Text style={[styles.contextDataText, { color: colors.text.primary }]}>
              {contextDataDisplay}
            </Text>
          </View>
        </View>
      )}

      {/* Reason Dropdown */}
      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
          Reason for Report *
        </Text>
        <TouchableOpacity
          style={[
            styles.dropdown,
            {
              borderColor: error && !selectedReason ? colors.error : colors.secondary,
              backgroundColor: colors.inputBg || colors.surface,
            }
          ]}
          onPress={() => setShowReasonPicker(true)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.dropdownText,
              { 
                color: selectedReason ? colors.text.primary : colors.text.placeholder 
              }
            ]}
          >
            {selectedReason 
              ? REPORT_REASONS.find(r => r.value === selectedReason)?.label 
              : 'Select reason...'}
          </Text>
          <Text style={[styles.dropdownArrow, { color: colors.text.secondary }]}>
            ▼
          </Text>
        </TouchableOpacity>
      </View>

      {/* Description Field */}
      <View style={styles.inputContainer}>
        <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
          Description *
        </Text>
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: error && !description.trim() ? colors.error : colors.secondary,
              backgroundColor: colors.inputBg || colors.surface,
              color: colors.text.primary,
            }
          ]}
          value={description}
          onChangeText={(text) => {
            if (text.length <= maxDescriptionLength) {
              setDescription(text);
              setError('');
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.text.placeholder}
          multiline
          maxLength={maxDescriptionLength}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.text.secondary }]}>
          {description.length} / {maxDescriptionLength}
        </Text>
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.cancelButton,
            {
              backgroundColor: colors.background + 'CC',
              borderColor: colors.text.secondary,
            }
          ]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text.secondary }]}>
            CANCEL
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: !isFormValid || isSubmittingFinal ? colors.buttonDisabled : colors.buttonBg,
              borderColor: colors.matrix,
            }
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || isSubmittingFinal}
          activeOpacity={0.7}
        >
          <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>
            {isSubmittingFinal ? 'SUBMITTING...' : 'SUBMIT REPORT'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const overlayContent = (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={Keyboard.dismiss}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.matrix }]}>
            {Platform.OS === 'ios' ? (
              <GestureScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                bounces={true}
              >
                {modalContent}
              </GestureScrollView>
            ) : (
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                bounces={true}
              >
                {modalContent}
              </ScrollView>
            )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );

  // Reason Picker Overlay - Using View instead of nested Modal to avoid iOS crash
  const reasonPickerOverlay = showReasonPicker && (
    <View style={styles.pickerOverlayContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.pickerOverlay}
        activeOpacity={1}
        onPress={() => setShowReasonPicker(false)}
      >
        <View
          style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.matrix }]}
          pointerEvents="box-none"
        >
          <View 
            style={[styles.pickerHeader, { borderBottomColor: colors.secondary }]}
            pointerEvents="auto"
          >
            <Text style={[styles.pickerTitle, { color: colors.text.primary }]}>
              Select Reason
            </Text>
            <TouchableOpacity
              onPress={() => setShowReasonPicker(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerClose, { color: colors.text.secondary }]}>
                ×
              </Text>
            </TouchableOpacity>
          </View>
          <View pointerEvents="auto">
            <FlatList
              data={REPORT_REASONS}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    {
                      backgroundColor: selectedReason === item.value ? colors.primary + '30' : 'transparent',
                    }
                  ]}
                  onPress={() => {
                    setSelectedReason(item.value);
                    setShowReasonPicker(false);
                    setError('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      {
                        color: selectedReason === item.value ? colors.primary : colors.text.primary,
                      }
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedReason === item.value && (
                    <Text style={[styles.pickerOptionCheck, { color: colors.primary }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  // Render as View overlay when inside another modal (to avoid nested Modal iOS crash)
  if (renderAsOverlay) {
    if (!visible) return null;
    return (
      <View style={styles.overlayContainer}>
        {overlayContent}
        {reasonPickerOverlay}
      </View>
    );
  }

  // Render as Modal when used standalone
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      {overlayContent}
      {reasonPickerOverlay}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.lg,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 600,
    minWidth: 400,
    maxHeight: '85%',
    minHeight: 400,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    maxHeight: '100%',
  },
  scrollContent: {
    padding: SIZING.spacing.lg,
    flexGrow: 1,
  },
  title: {
    fontSize: SIZING.font.h2,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: SIZING.spacing.lg,
    letterSpacing: 1,
  },
  section: {
    borderWidth: 1,
    borderRadius: 6,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
  },
  sectionTitle: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: SIZING.spacing.xs,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
    marginRight: SIZING.spacing.xs,
  },
  detailValue: {
    fontSize: SIZING.font.small,
    flex: 1,
  },
  contextDataContainer: {
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    marginTop: SIZING.spacing.xs,
  },
  contextDataText: {
    fontSize: SIZING.font.small,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: SIZING.spacing.md,
  },
  inputLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
    marginBottom: SIZING.spacing.xs,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    minHeight: 44,
  },
  dropdownText: {
    fontSize: SIZING.font.body,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: SIZING.font.body,
    marginLeft: SIZING.spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: SIZING.spacing.sm,
    minHeight: 100,
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.xs,
  },
  charCount: {
    fontSize: SIZING.font.small - 2,
    textAlign: 'right',
  },
  errorText: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
    marginTop: SIZING.spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    letterSpacing: 1,
  },
  submitButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.md,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    letterSpacing: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  pickerOverlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  pickerContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  pickerClose: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    lineHeight: SIZING.font.body,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerOptionText: {
    fontSize: SIZING.font.body,
    flex: 1,
  },
  pickerOptionCheck: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginLeft: SIZING.spacing.sm,
  },
});
