import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, TextInput, ScrollView, FlatList } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useCreateCrewMutation, useGetCrewStatusQuery, useSearchCrewsQuery, useGetSuggestedCrewsQuery, useApplyToCrewMutation, useWithdrawApplicationMutation } from '../../store/api/authApi';
import { VisitCrewModal } from './VisitCrewModal';
import { containsBadWordsAsSubstring } from '../../utils/contentModeration';

interface CrewOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

type CrewTab = 'join' | 'create';

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

const VALID_CHAR_REGEX = /^[a-zA-Z0-9_-]*$/;

export const CrewOnboardingModal: React.FC<CrewOnboardingModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const isProcessingRef = useRef(false);
  const [createCrew, { isLoading: isCreatingCrew }] = useCreateCrewMutation();
  const { data: crewStatus, refetch: refetchCrewStatus } = useGetCrewStatusQuery(undefined, {
    pollingInterval: visible ? 3000 : 0,
  });
  const [applyToCrew, { isLoading: isApplying }] = useApplyToCrewMutation();
  const [withdrawApplication, { isLoading: isWithdrawing }] = useWithdrawApplicationMutation();
  const [activeTab, setActiveTab] = useState<CrewTab>('join');
  const [crewName, setCrewName] = useState('');
  const [crewIdentifier, setCrewIdentifier] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [crewNameError, setCrewNameError] = useState('');
  const [crewIdentifierError, setCrewIdentifierError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showVisitCrewModal, setShowVisitCrewModal] = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [selectedCrewName, setSelectedCrewName] = useState<string | null>(null);
  const styles = createStyles(colors);
  const isInCrew = crewStatus?.isInCrew || false;

  useEffect(() => {
    if (isInCrew && visible) {
      setShowVisitCrewModal(false);
      setSelectedCrewId(null);
      setSelectedCrewName(null);
      onClose();
    }
  }, [isInCrew, visible, onClose]);

  const { data: searchResults, isLoading: isSearching } = useSearchCrewsQuery(
    searchQuery.trim(),
    { 
      skip: !searchQuery.trim() || searchQuery.trim().length === 0,
      pollingInterval: visible && searchQuery.trim().length > 0 ? 3000 : 0,
    }
  );
  const { data: suggestedCrewsData, isLoading: isLoadingSuggested } = useGetSuggestedCrewsQuery(undefined, {
    pollingInterval: visible ? 3000 : 0,
  });

  const searchCrews = useMemo(() => searchResults?.crews || [], [searchResults]);
  const suggestedCrews = useMemo(() => suggestedCrewsData?.crews || [], [suggestedCrewsData]);

  const handleApplyToggle = useCallback(async (crewId: string) => {
    if (isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    try {
      if (crewStatus?.appliedCrewId === crewId) {
        await withdrawApplication().unwrap();
      } else {
        await applyToCrew({ crewId }).unwrap();
      }
      await refetchCrewStatus();
    } catch (error: any) {
      console.error('Error toggling application:', error);
    } finally {
      isProcessingRef.current = false;
    }
  }, [crewStatus?.appliedCrewId, applyToCrew, withdrawApplication, refetchCrewStatus]);

  const validateCrewName = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'Crew name is required';
    }
    if (value.length > 12) {
      return 'Crew name must be 12 characters or less';
    }
    if (!VALID_CHAR_REGEX.test(value)) {
      return 'Only letters, numbers, _, and - are allowed';
    }
    if (containsBadWordsAsSubstring(value)) {
      return 'Crew name contains inappropriate language';
    }
    return '';
  }, []);

  const validateCrewIdentifier = useCallback((value: string): string => {
    if (!value.trim()) {
      return 'Crew identifier is required';
    }
    if (value.length > 5) {
      return 'Crew identifier must be 5 characters or less';
    }
    if (!VALID_CHAR_REGEX.test(value)) {
      return 'Only letters, numbers, _, and - are allowed';
    }
    if (containsBadWordsAsSubstring(value)) {
      return 'Crew identifier contains inappropriate language';
    }
    return '';
  }, []);

  const handleCrewNameChange = useCallback((text: string) => {
    const filtered = text.replace(/[^a-zA-Z0-9_-]/g, '');
    setCrewName(filtered);
    setCrewNameError(validateCrewName(filtered));
  }, [validateCrewName]);

  const handleCrewIdentifierChange = useCallback((text: string) => {
    const filtered = text.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
    setCrewIdentifier(filtered);
    setCrewIdentifierError(validateCrewIdentifier(filtered));
  }, [validateCrewIdentifier]);

  const handleLanguageSelect = useCallback((language: string) => {
    setSelectedLanguage(language);
    setShowLanguagePicker(false);
  }, []);

  const handleCreateCrew = useCallback(async () => {
    const nameError = validateCrewName(crewName);
    const identifierError = validateCrewIdentifier(crewIdentifier);
    
    setCrewNameError(nameError);
    setCrewIdentifierError(identifierError);
    setSubmitError('');

    if (nameError || identifierError || !selectedLanguage) {
      return;
    }

    try {
      await createCrew({
        crewName: crewName.trim(),
        crewIdentifier: crewIdentifier.trim().toUpperCase(),
        nativeLanguage: selectedLanguage
      }).unwrap();
      
      await refetchCrewStatus();
      onClose();
    } catch (error: any) {
      if (error?.data?.error) {
        setSubmitError(error.data.error);
      } else if (error?.error) {
        setSubmitError(error.error);
      } else {
        setSubmitError('Failed to create crew. Please try again.');
      }
    }
  }, [crewName, crewIdentifier, selectedLanguage, validateCrewName, validateCrewIdentifier, createCrew, refetchCrewStatus, onClose]);

  const isFormValid = !crewNameError && !crewIdentifierError && crewName.trim() && crewIdentifier.trim() && selectedLanguage && !isCreatingCrew;

  useEffect(() => {
    if (!visible) {
      setCrewName('');
      setCrewIdentifier('');
      setSelectedLanguage(null);
      setCrewNameError('');
      setCrewIdentifierError('');
      setShowLanguagePicker(false);
      setSubmitError('');
      setSearchQuery('');
      setShowVisitCrewModal(false);
      setSelectedCrewId(null);
      setSelectedCrewName(null);
    }
  }, [visible]);

  if (isInCrew) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.crewOnboardingContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Crew System</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'join' && styles.tabButtonActive]}
              onPress={() => setActiveTab('join')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'join' && styles.tabTextActive]}>
                Join a Crew
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'create' && styles.tabButtonActive]}
              onPress={() => setActiveTab('create')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
                Create a Crew
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {activeTab === 'join' ? (
              <ScrollView
                style={styles.joinCrewContent}
                contentContainerStyle={styles.joinCrewScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.searchSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Search for Crews
                  </Text>
                  <TextInput
                    style={[
                      styles.searchInput,
                      {
                        color: colors.text.primary,
                        borderColor: colors.secondary,
                        backgroundColor: colors.inputBg || colors.surface,
                      }
                    ]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by crew name or identifier..."
                    placeholderTextColor={colors.text.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {isSearching && (
                    <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                      Searching...
                    </Text>
                  )}
                  {searchQuery.trim() && !isSearching && (
                    <View style={styles.searchResultsContainer}>
                      {searchCrews.length > 0 ? (
                        searchCrews.map((crew) => (
                          <View
                            key={crew.id}
                            style={[
                              styles.crewResultItem,
                              { borderColor: colors.secondary, backgroundColor: colors.surface }
                            ]}
                          >
                            <View style={styles.crewResultHeader}>
                              <Text style={[styles.crewResultName, { color: colors.text.primary }]}>
                                {crew.crewName}
                              </Text>
                              <Text style={[styles.crewResultIdentifier, { color: colors.text.secondary }]}>
                                {crew.crewIdentifier}
                              </Text>
                            </View>
                            <View style={styles.crewResultDetails}>
                              <Text style={[styles.crewResultDetail, { color: colors.text.secondary }]}>
                                Language: {crew.nativeLanguage}
                              </Text>
                              <Text style={[styles.crewResultDetail, { color: colors.text.secondary }]}>
                                Members: {crew.memberCount}
                              </Text>
                            </View>
                            <View style={styles.crewResultButtons}>
                              <TouchableOpacity
                                style={[
                                  styles.crewResultButton,
                                  styles.crewResultButtonView,
                                  { borderColor: colors.secondary, backgroundColor: colors.surface }
                                ]}
                                onPress={() => {
                                  setSelectedCrewId(crew.id);
                                  setSelectedCrewName(crew.crewName);
                                  setShowVisitCrewModal(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.crewResultButtonText, { color: colors.text.primary }]}>
                                  View
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.crewResultButton,
                                  styles.crewResultButtonJoin,
                                  {
                                    borderColor: crewStatus?.appliedCrewId === crew.id ? '#4CAF50' : colors.primary,
                                    backgroundColor: crewStatus?.appliedCrewId === crew.id ? '#4CAF50' : colors.primary
                                  }
                                ]}
                                onPress={() => handleApplyToggle(crew.id)}
                                disabled={isApplying || isWithdrawing || isProcessingRef.current}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.crewResultButtonText, { color: '#FFFFFF' }]}>
                                  {isApplying || isWithdrawing ? 'Processing...' : crewStatus?.appliedCrewId === crew.id ? 'Applied' : 'Request to Join'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.noResultsText, { color: colors.text.secondary }]}>
                          No crews found matching your search.
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.suggestedSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                    Suggested Crews
                  </Text>
                  {isLoadingSuggested ? (
                    <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
                      Loading suggested crews...
                    </Text>
                  ) : suggestedCrews.length > 0 ? (
                    <View style={styles.suggestedCrewsContainer}>
                      {suggestedCrews.map((crew, index) => (
                        <View
                          key={crew.id}
                          style={[
                            styles.suggestedCrewItem,
                            { borderColor: colors.secondary, backgroundColor: colors.surface }
                          ]}
                        >
                          <View style={styles.suggestedCrewNumber}>
                            <Text style={[styles.suggestedCrewNumberText, { color: colors.primary }]}>
                              {index + 1}
                            </Text>
                          </View>
                          <View style={styles.suggestedCrewInfo}>
                            <View style={styles.suggestedCrewHeader}>
                              <Text style={[styles.suggestedCrewName, { color: colors.text.primary }]}>
                                {crew.crewName}
                              </Text>
                              <Text style={[styles.suggestedCrewIdentifier, { color: colors.text.secondary }]}>
                                {crew.crewIdentifier}
                              </Text>
                            </View>
                            <View style={styles.suggestedCrewDetails}>
                              <Text style={[styles.suggestedCrewDetail, { color: colors.text.secondary }]}>
                                Language: {crew.nativeLanguage}
                              </Text>
                              <Text style={[styles.suggestedCrewDetail, { color: colors.text.secondary }]}>
                                Members: {crew.memberCount}
                              </Text>
                            </View>
                            <View style={styles.suggestedCrewButtons}>
                              <TouchableOpacity
                                style={[
                                  styles.suggestedCrewButton,
                                  styles.suggestedCrewButtonView,
                                  { borderColor: colors.secondary, backgroundColor: colors.surface }
                                ]}
                                onPress={() => {
                                  setSelectedCrewId(crew.id);
                                  setSelectedCrewName(crew.crewName);
                                  setShowVisitCrewModal(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.suggestedCrewButtonText, { color: colors.text.primary }]}>
                                  View
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.suggestedCrewButton,
                                  styles.suggestedCrewButtonJoin,
                                  {
                                    borderColor: crewStatus?.appliedCrewId === crew.id ? '#4CAF50' : colors.primary,
                                    backgroundColor: crewStatus?.appliedCrewId === crew.id ? '#4CAF50' : colors.primary
                                  }
                                ]}
                                onPress={() => handleApplyToggle(crew.id)}
                                disabled={isApplying || isWithdrawing || isProcessingRef.current}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.suggestedCrewButtonText, { color: '#FFFFFF' }]}>
                                  {isApplying || isWithdrawing ? 'Processing...' : crewStatus?.appliedCrewId === crew.id ? 'Applied' : 'Request to Join'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.noResultsText, { color: colors.text.secondary }]}>
                      No crews available at this time.
                    </Text>
                  )}
                </View>
              </ScrollView>
            ) : (
              <ScrollView 
                style={styles.createCrewContent}
                contentContainerStyle={styles.createCrewScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formSection}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>
                    Crew Name
                  </Text>
                  <Text style={[styles.labelHint, { color: colors.text.secondary }]}>
                    Maximum 12 characters
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text.primary,
                        borderColor: crewNameError ? colors.error : colors.secondary,
                        backgroundColor: colors.inputBg || colors.surface,
                      }
                    ]}
                    value={crewName}
                    onChangeText={handleCrewNameChange}
                    placeholder="Enter crew name..."
                    placeholderTextColor={colors.text.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={12}
                  />
                  {crewNameError ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {crewNameError}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.formSection}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>
                    Crew Identifier
                  </Text>
                  <Text style={[styles.labelHint, { color: colors.text.secondary }]}>
                    Maximum 5 characters (e.g., ABC12)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text.primary,
                        borderColor: crewIdentifierError ? colors.error : colors.secondary,
                        backgroundColor: colors.inputBg || colors.surface,
                      }
                    ]}
                    value={crewIdentifier}
                    onChangeText={handleCrewIdentifierChange}
                    placeholder="Enter identifier..."
                    placeholderTextColor={colors.text.placeholder}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={5}
                  />
                  {crewIdentifierError ? (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {crewIdentifierError}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.formSection}>
                  <Text style={[styles.label, { color: colors.text.primary }]}>
                    Native Language
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.languageSelector,
                      {
                        borderColor: selectedLanguage ? colors.secondary : colors.secondary,
                        backgroundColor: colors.inputBg || colors.surface,
                      }
                    ]}
                    onPress={() => setShowLanguagePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.languageSelectorText,
                      { color: selectedLanguage ? colors.text.primary : colors.text.placeholder }
                    ]}>
                      {selectedLanguage || 'Select language...'}
                    </Text>
                    <Text style={[styles.languageSelectorArrow, { color: colors.secondary }]}>
                      ▼
                    </Text>
                  </TouchableOpacity>
                </View>

                {submitError ? (
                  <Text style={[styles.errorText, { color: colors.error, marginBottom: SIZING.spacing.sm }]}>
                    {submitError}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    {
                      backgroundColor: isFormValid ? colors.buttonBg : colors.buttonDisabled,
                      borderColor: colors.matrix,
                    }
                  ]}
                  onPress={handleCreateCrew}
                  disabled={!isFormValid}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.createButtonText, { color: '#FFFFFF' }]}>
                    {isCreatingCrew ? 'Creating...' : 'Create Crew'}
                  </Text>
                  <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          <Modal
            visible={showLanguagePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowLanguagePicker(false)}
          >
            <TouchableOpacity
              style={styles.languagePickerOverlay}
              activeOpacity={1}
              onPress={() => setShowLanguagePicker(false)}
            >
              <View 
                style={[styles.languagePickerContainer, { backgroundColor: colors.surface, borderColor: colors.secondary }]}
                onStartShouldSetResponder={() => true}
              >
                <View style={[styles.languagePickerHeader, { borderBottomColor: colors.secondary }]}>
                  <Text style={[styles.languagePickerTitle, { color: colors.text.primary }]}>
                    Select Language
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowLanguagePicker(false)}
                    style={styles.languagePickerClose}
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

          {selectedCrewId && (
            <VisitCrewModal
              visible={showVisitCrewModal}
              onClose={() => {
                setShowVisitCrewModal(false);
                setSelectedCrewId(null);
                setSelectedCrewName(null);
              }}
              crewId={selectedCrewId}
              crewName={selectedCrewName || undefined}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  crewOnboardingContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  title: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZING.spacing.md,
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 28,
    marginTop: -2,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
    gap: SIZING.spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SIZING.spacing.lg,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
  },
  joinCrewContent: {
    flex: 1,
  },
  joinCrewScrollContent: {
    padding: SIZING.spacing.md,
  },
  searchSection: {
    marginBottom: SIZING.spacing.lg * 2,
  },
  suggestedSection: {
    marginBottom: SIZING.spacing.lg,
  },
  sectionTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SIZING.spacing.md,
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.sm,
  },
  loadingText: {
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
    marginTop: SIZING.spacing.xs,
  },
  searchResultsContainer: {
    marginTop: SIZING.spacing.sm,
  },
  crewResultItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
  },
  crewResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  crewResultName: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    flex: 1,
  },
  crewResultIdentifier: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
  },
  crewResultDetails: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  crewResultDetail: {
    fontSize: SIZING.font.small,
  },
  crewResultButtons: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
    marginTop: SIZING.spacing.md,
  },
  crewResultButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewResultButtonView: {
    // Styling handled inline
  },
  crewResultButtonJoin: {
    // Styling handled inline
  },
  crewResultButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  noResultsText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    padding: SIZING.spacing.md,
    fontStyle: 'italic',
  },
  suggestedCrewsContainer: {
    marginTop: SIZING.spacing.sm,
  },
  suggestedCrewItem: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
    alignItems: 'center',
  },
  suggestedCrewNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZING.spacing.md,
  },
  suggestedCrewNumberText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  suggestedCrewInfo: {
    flex: 1,
  },
  suggestedCrewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
  },
  suggestedCrewName: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    flex: 1,
  },
  suggestedCrewIdentifier: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
  },
  suggestedCrewDetails: {
    flexDirection: 'row',
    gap: SIZING.spacing.md,
  },
  suggestedCrewDetail: {
    fontSize: SIZING.font.small,
  },
  suggestedCrewButtons: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
    marginTop: SIZING.spacing.md,
  },
  suggestedCrewButton: {
    flex: 1,
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedCrewButtonView: {
    // Styling handled inline
  },
  suggestedCrewButtonJoin: {
    // Styling handled inline
  },
  suggestedCrewButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  createCrewContent: {
    flex: 1,
  },
  createCrewScrollContent: {
    padding: SIZING.spacing.md,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  formSection: {
    marginBottom: SIZING.spacing.lg,
  },
  label: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  labelHint: {
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.sm,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SIZING.spacing.md,
    fontSize: SIZING.font.body,
  },
  errorText: {
    fontSize: SIZING.font.small,
    marginTop: SIZING.spacing.xs,
  },
  languageSelector: {
    height: 44,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SIZING.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageSelectorText: {
    fontSize: SIZING.font.body,
    flex: 1,
  },
  languageSelectorArrow: {
    fontSize: 12,
    marginLeft: SIZING.spacing.sm,
  },
  createButton: {
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZING.spacing.lg,
    position: 'relative',
  },
  createButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  buttonCorner: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  languagePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  languagePickerContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 8,
    borderWidth: 1,
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
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  languagePickerClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languagePickerCloseText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(71, 23, 246, 0.2)',
  },
  languageOptionText: {
    fontSize: SIZING.font.body,
  },
  languageOptionCheck: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
});

