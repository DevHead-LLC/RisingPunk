import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

const LANGUAGES = [
  'English',
  'Spanish',
  'Chinese (Mandarin)',
  'Tagalog',
  'Vietnamese',
  'French',
  'Arabic',
  'Korean',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Polish',
  'Russian',
  'Hindi',
  'Hebrew',
  'Yiddish',
  'Urdu',
  'Persian',
  'Turkish',
];

interface EditCrewLanguageModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (nativeLanguage: string) => Promise<void>;
  currentLanguage: string;
}

export const EditCrewLanguageModal: React.FC<EditCrewLanguageModalProps> = ({
  visible,
  onClose,
  onUpdate,
  currentLanguage,
}) => {
  const colors = useThemeColors();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedLanguage(currentLanguage);
      setError('');
      setShowLanguagePicker(false);
    } else {
      setShowLanguagePicker(false);
    }
  }, [visible, currentLanguage]);

  const handleLanguageSelect = useCallback((language: string) => {
    setSelectedLanguage(language);
    setShowLanguagePicker(false);
    setError('');
  }, []);

  const handleUpdate = async () => {
    if (!selectedLanguage) {
      setError('Please select a language');
      return;
    }

    if (selectedLanguage === currentLanguage) {
      onClose();
      return;
    }

    setError('');
    setIsUpdating(true);
    try {
      await onUpdate(selectedLanguage);
    } catch (error: any) {
      setError(error?.message || error?.data?.error || 'Failed to update crew language. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setSelectedLanguage(null);
    setError('');
    setShowLanguagePicker(false);
    onClose();
  };

  const styles = createStyles(colors);
  const isFormValid = selectedLanguage && selectedLanguage !== currentLanguage;

  return (
    <>
      <Modal
        visible={visible && !showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        supportedOrientations={['landscape']}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>CHANGE CREW LANGUAGE</Text>
            
            <Text style={styles.descriptionText}>
              Update your crew's primary language. This setting identifies the primary language used by your crew.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Primary Language
              </Text>
              <TouchableOpacity
                style={[
                  styles.languageSelector,
                  {
                    borderColor: error ? colors.error : colors.secondary,
                    backgroundColor: colors.inputBg || colors.surface,
                  }
                ]}
                onPress={() => setShowLanguagePicker(true)}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageSelectorText,
                    { 
                      color: selectedLanguage ? colors.text.primary : colors.text.placeholder 
                    }
                  ]}
                >
                  {selectedLanguage || 'Select language...'}
                </Text>
                <Text style={[styles.languageSelectorArrow, { color: colors.secondary }]}>
                  ▼
                </Text>
              </TouchableOpacity>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.updateButton,
                  (!isFormValid || isUpdating) && styles.updateButtonDisabled
                ]}
                onPress={handleUpdate}
                disabled={!isFormValid || isUpdating}
                activeOpacity={0.7}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.updateButtonText}>UPDATE LANGUAGE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={visible && showLanguagePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
        supportedOrientations={['landscape']}
        statusBarTranslucent={true}
        hardwareAccelerated={true}
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity
          style={styles.languagePickerOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguagePicker(false)}
        >
          <View 
            style={[styles.languagePickerContainer, { backgroundColor: colors.surface, borderColor: colors.secondary }]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
          >
            <View style={[styles.languagePickerHeader, { borderBottomColor: colors.secondary }]}>
              <Text style={[styles.languagePickerTitle, { color: colors.text.primary }]}>
                Select Language
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguagePicker(false)}
                style={styles.languagePickerClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.languagePickerCloseText, { color: colors.text.secondary }]}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    {
                      backgroundColor: selectedLanguage === item ? colors.primary + '30' : 'transparent',
                    }
                  ]}
                  onPress={() => handleLanguageSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.languageOptionText,
                    { 
                      color: selectedLanguage === item ? colors.primary : colors.text.primary 
                    }
                  ]}>
                    {item}
                  </Text>
                  {selectedLanguage === item && (
                    <Text style={[styles.languageOptionCheck, { color: colors.primary }]}>
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: SIZING.spacing.lg,
    margin: SIZING.spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary,
    minWidth: 400,
    maxWidth: 600,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
  },
  descriptionText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'left',
    marginBottom: SIZING.spacing.lg,
    lineHeight: SIZING.font.body + 4,
  },
  inputContainer: {
    marginBottom: SIZING.spacing.lg,
  },
  inputLabel: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.sm,
  },
  languageSelector: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageSelectorText: {
    fontSize: SIZING.font.body,
    flex: 1,
  },
  languageSelectorArrow: {
    fontSize: SIZING.font.body,
    marginLeft: SIZING.spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  updateButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  updateButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
  languagePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languagePickerContainer: {
    width: '80%',
    maxWidth: 500,
    maxHeight: '70%',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  languagePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
  },
  languagePickerTitle: {
    fontSize: SIZING.font.h3,
    fontWeight: 'bold',
  },
  languagePickerClose: {
    padding: SIZING.spacing.xs,
  },
  languagePickerCloseText: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  languageOptionText: {
    fontSize: SIZING.font.body,
    flex: 1,
  },
  languageOptionCheck: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginLeft: SIZING.spacing.sm,
  },
});


