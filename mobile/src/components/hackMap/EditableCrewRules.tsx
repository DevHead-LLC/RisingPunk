import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useUpdateCrewRulesMutation } from '../../store/api/authApi';
import { FilteredTextInput } from '../common/FilteredTextInput';
import { FilteredText } from '../common/FilteredText';
import { UserReportModal } from '../modals/UserReportModal';
import { useAppSelector } from '../../store/hooks';

interface EditableCrewRulesProps {
  crewId: string;
  crewRules: string[];
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
  presidentId?: string;
  presidentHandle?: string;
}

export const EditableCrewRules: React.FC<EditableCrewRulesProps> = ({
  crewId,
  crewRules: initialCrewRules,
  isEditing,
  onEditingChange,
  presidentId,
  presidentHandle,
}) => {
  const colors = useThemeColors();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [localRules, setLocalRules] = useState<string[]>(initialCrewRules || []);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportedRuleIndex, setReportedRuleIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const inputRefs = useRef<{ [key: number]: TextInput | null }>({});
  const isCreatingNewCardRef = useRef<boolean>(false);
  const [updateCrewRules, { isLoading: isSaving }] = useUpdateCrewRulesMutation();
  const initialRulesLengthRef = useRef<number | null>(null);
  const lastSyncedRulesRef = useRef<string[]>(initialCrewRules || []);
  const pendingSaveRef = useRef<string[] | null>(null);
  const initialCrewRulesRef = useRef<string[]>(initialCrewRules || []);
  const prevIsEditingRef = useRef<boolean>(isEditing);
  const hasMountedRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const flushPendingSaveRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    initialCrewRulesRef.current = initialCrewRules || [];
  }, [initialCrewRules]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditing) {
      const currentRules = initialCrewRules || [];
      const lastSyncedRules = lastSyncedRulesRef.current;
      const localRulesString = JSON.stringify(localRules);
      const lastSyncedRulesString = JSON.stringify(lastSyncedRules);
      const currentRulesString = JSON.stringify(currentRules);
      const pendingSaveString = pendingSaveRef.current ? JSON.stringify(pendingSaveRef.current) : null;
      
      const hasLocalEdits = localRulesString !== lastSyncedRulesString;
      const rulesChanged = currentRulesString !== lastSyncedRulesString;
      const localMatchesCurrent = localRulesString === currentRulesString;
      const pendingSaveMatchesCurrent = pendingSaveString === currentRulesString;
      const localMatchesPendingSave = pendingSaveString ? localRulesString === pendingSaveString : false;
      
      if (rulesChanged && pendingSaveRef.current && !pendingSaveMatchesCurrent) {
        if (!localMatchesPendingSave) {
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }
          pendingSaveRef.current = null;
        }
      }
      
      if (rulesChanged) {
        if (!hasLocalEdits) {
          if (localMatchesCurrent) {
            lastSyncedRulesRef.current = currentRules;
          } else {
            const justSaved = localRulesString === lastSyncedRulesString;
            if (justSaved && pendingSaveRef.current) {
              lastSyncedRulesRef.current = currentRules;
            } else {
              setLocalRules(currentRules);
              lastSyncedRulesRef.current = currentRules;
            }
          }
        } else {
          if (localMatchesCurrent) {
            lastSyncedRulesRef.current = currentRules;
          }
        }
      } else {
        lastSyncedRulesRef.current = currentRules;
      }
      initialRulesLengthRef.current = null;
    }
  }, [initialCrewRules, isEditing]);

  useEffect(() => {
    if (isEditing) {
      const rulesLength = localRules.length;
      
      if (rulesLength === 0) {
        setLocalRules(['']);
        setEditingIndex(0);
        setFocusedIndex(0);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else if (initialRulesLengthRef.current === null) {
        initialRulesLengthRef.current = rulesLength;
        if (rulesLength >= 2) {
          setEditingIndex(1);
          setFocusedIndex(1);
          setTimeout(() => {
            inputRefs.current[1]?.focus();
          }, 100);
        } else if (rulesLength === 1) {
          setEditingIndex(0);
          setFocusedIndex(0);
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 100);
        }
      }
    } else {
      setEditingIndex(null);
      setFocusedIndex(null);
      initialRulesLengthRef.current = null;
    }
  }, [isEditing]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const currentPendingSave = pendingSaveRef.current;
    if (!currentPendingSave) {
      return;
    }

    try {
      const serverRulesString = JSON.stringify(initialCrewRulesRef.current || []);
      const pendingSaveString = JSON.stringify(currentPendingSave);
      
      if (serverRulesString !== pendingSaveString) {
        await updateCrewRules({
          crewId,
          crewRules: currentPendingSave,
        }).unwrap();
      }
      
      if (isMountedRef.current) {
        lastSyncedRulesRef.current = currentPendingSave;
      }
      pendingSaveRef.current = null;
    } catch (error) {
      console.error('Error saving crew rules:', error);
      pendingSaveRef.current = null;
    }
  }, [crewId, updateCrewRules]);

  useEffect(() => {
    flushPendingSaveRef.current = flushPendingSave;
  }, [flushPendingSave]);

  const saveRules = useCallback(async (rulesToSave: string[], immediate = false) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const filteredRules = rulesToSave.filter(rule => rule.trim().length > 0);
    const currentRulesString = JSON.stringify(initialCrewRulesRef.current || []);
    const rulesToSaveString = JSON.stringify(filteredRules);
    
    if (currentRulesString === rulesToSaveString) {
      lastSyncedRulesRef.current = filteredRules;
      pendingSaveRef.current = null;
      return;
    }

    pendingSaveRef.current = filteredRules;
    
    if (immediate) {
      await flushPendingSave();
      return;
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const currentPendingSave = pendingSaveRef.current;
      if (!currentPendingSave) {
        return;
      }
      
      try {
        const serverRulesString = JSON.stringify(initialCrewRulesRef.current || []);
        const pendingSaveString = JSON.stringify(currentPendingSave);
        
        if (serverRulesString !== pendingSaveString) {
          await updateCrewRules({
            crewId,
            crewRules: currentPendingSave,
          }).unwrap();
        }
        
        if (isMountedRef.current) {
          lastSyncedRulesRef.current = currentPendingSave;
        }
        if (pendingSaveRef.current === currentPendingSave) {
          pendingSaveRef.current = null;
        }
      } catch (error) {
        console.error('Error saving crew rules:', error);
        if (pendingSaveRef.current === currentPendingSave) {
          pendingSaveRef.current = null;
        }
      }
    }, 2000);
  }, [crewId, updateCrewRules, flushPendingSave]);

  useEffect(() => {
    const wasEditing = prevIsEditingRef.current;
    const isMount = !hasMountedRef.current;
    hasMountedRef.current = true;
    prevIsEditingRef.current = isEditing;
    
    if (!isEditing && (wasEditing || isMount)) {
      const filteredRules = localRules.filter(rule => rule.trim().length > 0);
      if (filteredRules.length !== localRules.length) {
        setLocalRules(filteredRules);
        const currentServerRules = initialCrewRulesRef.current || [];
        const filteredRulesString = JSON.stringify(filteredRules);
        const serverRulesString = JSON.stringify(currentServerRules);
        if (filteredRulesString !== serverRulesString) {
          saveRules(filteredRules, true);
        }
      } else if (!isMount) {
        const currentServerRules = initialCrewRulesRef.current || [];
        const localRulesString = JSON.stringify(localRules);
        const serverRulesString = JSON.stringify(currentServerRules);
        if (localRulesString !== serverRulesString) {
          saveRules(localRules, true);
        }
      }
    }
  }, [isEditing, localRules, saveRules]);

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current && flushPendingSaveRef.current) {
        flushPendingSaveRef.current().catch((error) => {
          console.error('Error flushing pending save on unmount:', error);
        });
      }
    };
  }, []);

  const handleRuleChange = useCallback((index: number, value: string) => {
    const newRules = [...localRules];
    newRules[index] = value;
    setLocalRules(newRules);
    saveRules(newRules);
  }, [localRules, saveRules]);

  const handleRuleFocus = useCallback((index: number) => {
    setFocusedIndex(index);
    setEditingIndex(index);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      pendingSaveRef.current = null;
    }
  }, []);

  const handleRuleBlur = useCallback((index: number) => {
    if (isCreatingNewCardRef.current) {
      return;
    }
    setFocusedIndex(null);
    const newRules = localRules.filter(rule => rule.trim().length > 0);
    if (newRules.length !== localRules.length) {
      setLocalRules(newRules);
      saveRules(newRules);
    } else {
      saveRules(localRules);
    }
  }, [localRules, saveRules]);

  const handleSaveCard = useCallback((index: number) => {
    const currentValue = localRules[index]?.trim() || '';
    
    if (currentValue.length === 0) {
      inputRefs.current[index]?.blur();
      const filteredRules = localRules.filter((_, i) => i !== index || localRules[i].trim().length > 0);
      if (filteredRules.length === 0) {
        setLocalRules(['']);
        setEditingIndex(0);
        setFocusedIndex(0);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else {
        setLocalRules(filteredRules);
      }
      saveRules(filteredRules.length === 0 ? [''] : filteredRules);
      return;
    }

    if (index === localRules.length - 1) {
      isCreatingNewCardRef.current = true;
      const newRules = [...localRules, ''];
      setLocalRules(newRules);
      setEditingIndex(localRules.length);
      setFocusedIndex(localRules.length);
      saveRules(localRules);
      setTimeout(() => {
        if (inputRefs.current[localRules.length]) {
          inputRefs.current[localRules.length]?.focus();
        }
        setTimeout(() => {
          isCreatingNewCardRef.current = false;
        }, 300);
      }, 150);
    } else {
      isCreatingNewCardRef.current = false;
      inputRefs.current[index]?.blur();
      saveRules(localRules);
    }
  }, [localRules, saveRules]);

  const handleSubmitEditing = useCallback((index: number) => {
    handleSaveCard(index);
  }, [handleSaveCard]);

  const handleDelete = useCallback((index: number) => {
    const newRules = localRules.filter((_, i) => i !== index);
    
    if (newRules.length === 0) {
      setLocalRules(['']);
      setEditingIndex(0);
      setFocusedIndex(0);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } else {
      setLocalRules(newRules);
      if (editingIndex === index) {
        const nextIndex = Math.min(index, newRules.length - 1);
        setEditingIndex(nextIndex);
        setFocusedIndex(nextIndex);
        setTimeout(() => {
          inputRefs.current[nextIndex]?.focus();
        }, 100);
      }
    }
    saveRules(newRules.length === 0 ? [''] : newRules);
  }, [localRules, editingIndex, saveRules]);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    const newRules = [...localRules];
    [newRules[index - 1], newRules[index]] = [newRules[index], newRules[index - 1]];
    setLocalRules(newRules);
    saveRules(newRules);
  }, [localRules, saveRules]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === localRules.length - 1) return;
    const newRules = [...localRules];
    [newRules[index], newRules[index + 1]] = [newRules[index + 1], newRules[index]];
    setLocalRules(newRules);
    saveRules(newRules);
  }, [localRules, saveRules]);

  const handleAddNewRule = useCallback(() => {
    const newRules = [...localRules, ''];
    setLocalRules(newRules);
    setEditingIndex(localRules.length);
    setFocusedIndex(localRules.length);
    setTimeout(() => {
      inputRefs.current[localRules.length]?.focus();
    }, 100);
  }, [localRules]);

  const handleReportRule = useCallback((index: number) => {
    setReportedRuleIndex(index);
    setShowReportModal(true);
  }, []);

  const handleCloseReportModal = useCallback(() => {
    setShowReportModal(false);
    setReportedRuleIndex(null);
  }, []);

  const styles = createStyles(colors);

  if (!isEditing && localRules.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
          No rules have been set
        </Text>
      </View>
    );
  }

  if (!isEditing) {
    return (
      <>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {localRules.map((rule, index) => (
            <View key={index} style={[styles.ruleCard, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
              <View style={styles.ruleCardContent}>
                <Text style={[styles.ruleNumber, { color: colors.text.secondary }]}>
                  {index + 1}.
                </Text>
                <FilteredText style={[styles.ruleText, { color: colors.text.primary }]}>
                  {rule}
                </FilteredText>
              </View>
              {presidentId && presidentHandle && (
                <TouchableOpacity
                  onPress={() => handleReportRule(index)}
                  activeOpacity={0.7}
                  style={[styles.reportButton, { backgroundColor: colors.background + 'E6' }]}
                >
                  <Text style={[styles.reportButtonText, { color: colors.text.secondary }]}>
                    Report
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
        {currentUser && presidentId && presidentHandle && reportedRuleIndex !== null && (
          <UserReportModal
            visible={showReportModal}
            onClose={handleCloseReportModal}
            reportedUserId={presidentId}
            reportedUsername={presidentHandle}
            reportingUserId={currentUser._id}
            reportingUsername={currentUser.handle || 'Unknown'}
            context="crew-rules"
            contextData={{
              ruleText: localRules[reportedRuleIndex],
              ruleIndex: reportedRuleIndex,
              crewId: crewId,
              allRules: localRules,
            }}
            maxDescriptionLength={1000}
          />
        )}
      </>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {localRules.length === 0 && (
        <TouchableOpacity
          style={[styles.addFirstCardButton, { borderColor: colors.primary, backgroundColor: colors.primary }]}
          onPress={() => {
            setLocalRules(['']);
            setEditingIndex(0);
            setFocusedIndex(0);
            setTimeout(() => {
              inputRefs.current[0]?.focus();
            }, 100);
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.addFirstCardButtonText, { color: colors.background }]}>
            + Add First Rule
          </Text>
        </TouchableOpacity>
      )}
      {localRules.map((rule, index) => (
        <View
          key={index}
          style={[
            styles.editableRuleCard,
            {
              borderColor: focusedIndex === index ? colors.primary : colors.secondary,
              backgroundColor: colors.surface
            }
          ]}
        >
          <View style={styles.ruleHeader}>
            <Text style={[styles.ruleNumber, { color: colors.text.secondary }]}>
              {index + 1}.
            </Text>
            <View style={styles.ruleActions}>
              <TouchableOpacity
                style={[styles.moveButton, { borderColor: colors.secondary }]}
                onPress={() => handleMoveUp(index)}
                disabled={index === 0}
                activeOpacity={0.7}
              >
                <Text style={[styles.moveButtonText, { color: index === 0 ? colors.text.secondary + '60' : colors.text.primary }]}>
                  ↑
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moveButton, { borderColor: colors.secondary }]}
                onPress={() => handleMoveDown(index)}
                disabled={index === localRules.length - 1}
                activeOpacity={0.7}
              >
                <Text style={[styles.moveButtonText, { color: index === localRules.length - 1 ? colors.text.secondary + '60' : colors.text.primary }]}>
                  ↓
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                onPress={() => handleSaveCard(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.saveButtonText, { color: colors.background }]}>
                  ✓
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.error }]}
                onPress={() => handleDelete(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.deleteButtonText, { color: colors.error }]}>
                  🗑️
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.ruleInputContainer}>
            <FilteredTextInput
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[styles.crewRuleInput, { color: colors.text.primary }]}
              value={rule}
              onChangeText={(value) => {
                const singleLineValue = value.replace(/\n/g, '');
                handleRuleChange(index, singleLineValue);
              }}
              onFocus={() => handleRuleFocus(index)}
              onBlur={() => handleRuleBlur(index)}
              onSubmitEditing={() => handleSaveCard(index)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Enter' || nativeEvent.key === '\n') {
                  handleSaveCard(index);
                }
              }}
              returnKeyType={index === localRules.length - 1 ? 'done' : 'done'}
              placeholder={`Rule ${index + 1}`}
              placeholderTextColor={colors.text.secondary + '80'}
              autoFocus={editingIndex === index}
              blurOnSubmit={false}
            />
            {presidentId && presidentHandle && (
              <TouchableOpacity
                onPress={() => handleReportRule(index)}
                activeOpacity={0.7}
                style={[styles.reportButton, { backgroundColor: colors.background + 'E6' }]}
              >
                <Text style={[styles.reportButtonText, { color: colors.text.secondary }]}>
                  Report
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.addNewRuleButton, { borderColor: colors.primary, backgroundColor: colors.primary }]}
        onPress={handleAddNewRule}
        activeOpacity={0.7}
      >
        <Text style={[styles.addNewRuleButtonText, { color: colors.background }]}>
          + New Rule
        </Text>
      </TouchableOpacity>
      {isSaving && (
        <View style={styles.savingIndicator}>
          <Text style={[styles.savingText, { color: colors.text.secondary }]}>
            Saving...
          </Text>
        </View>
      )}
      {currentUser && presidentId && presidentHandle && reportedRuleIndex !== null && (
        <UserReportModal
          visible={showReportModal}
          onClose={handleCloseReportModal}
          reportedUserId={presidentId}
          reportedUsername={presidentHandle}
          reportingUserId={currentUser._id}
          reportingUsername={currentUser.handle || 'Unknown'}
          context="crew-rules"
          contextData={{
            ruleText: localRules[reportedRuleIndex],
            ruleIndex: reportedRuleIndex,
            crewId: crewId,
            allRules: localRules,
          }}
          maxDescriptionLength={1000}
        />
      )}
    </ScrollView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ruleCard: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
    minHeight: 50,
  },
  ruleCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 60,
  },
  editableRuleCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZING.spacing.sm,
  },
  ruleNumber: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginRight: SIZING.spacing.sm,
    minWidth: 30,
  },
  ruleText: {
    fontSize: SIZING.font.body,
    flex: 1,
    lineHeight: 22,
  },
  ruleInputContainer: {
    position: 'relative',
    paddingRight: 60,
  },
  crewRuleInput: {
    fontSize: SIZING.font.body,
    height: 40,
    lineHeight: 22,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  reportButton: {
    position: 'absolute',
    bottom: -3,
    right: 4,
    paddingVertical: SIZING.spacing.xs / 2,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  reportButtonText: {
    fontSize: SIZING.font.small - 5,
    fontWeight: '500',
  },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: SIZING.spacing.xs,
  },
  moveButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  moveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  saveButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  savingIndicator: {
    alignItems: 'center',
    padding: SIZING.spacing.md,
  },
  savingText: {
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
  },
  addFirstCardButton: {
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZING.spacing.md,
  },
  addFirstCardButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  addNewRuleButton: {
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
  },
  addNewRuleButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
});

