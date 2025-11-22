import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useUpdateCrewRulesMutation } from '../../store/api/authApi';

interface EditableCrewRulesProps {
  crewId: string;
  crewRules: string[];
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

export const EditableCrewRules: React.FC<EditableCrewRulesProps> = ({
  crewId,
  crewRules: initialCrewRules,
  isEditing,
  onEditingChange,
}) => {
  const colors = useThemeColors();
  const [localRules, setLocalRules] = useState<string[]>(initialCrewRules || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const inputRefs = useRef<{ [key: number]: TextInput | null }>({});
  const isCreatingNewCardRef = useRef<boolean>(false);
  const [updateCrewRules, { isLoading: isSaving }] = useUpdateCrewRulesMutation();
  const initialRulesLengthRef = useRef<number | null>(null);
  const lastSyncedRulesRef = useRef<string[]>(initialCrewRules || []);

  useEffect(() => {
    const currentRules = initialCrewRules || [];
    const lastSyncedRules = lastSyncedRulesRef.current;
    
    const rulesChanged = JSON.stringify(currentRules) !== JSON.stringify(lastSyncedRules);
    
    if (!isEditing && rulesChanged) {
      setLocalRules(currentRules);
      lastSyncedRulesRef.current = currentRules;
      initialRulesLengthRef.current = null;
    } else if (!isEditing && !rulesChanged) {
      initialRulesLengthRef.current = null;
    }
  }, [initialCrewRules, isEditing]);

  useEffect(() => {
    if (!isEditing) {
      const filteredRules = localRules.filter(rule => rule.trim().length > 0);
      if (filteredRules.length !== localRules.length) {
        setLocalRules(filteredRules);
        if (filteredRules.length > 0) {
          saveRules(filteredRules);
        } else {
          saveRules([]);
        }
      } else if (localRules.length > 0) {
        saveRules(localRules);
      }
    }
  }, [isEditing]);

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

  const saveRules = useCallback(async (rulesToSave: string[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const filteredRules = rulesToSave.filter(rule => rule.trim().length > 0);
        await updateCrewRules({
          crewId,
          crewRules: filteredRules,
        }).unwrap();
      } catch (error) {
        console.error('Error saving crew rules:', error);
      }
    }, 2000);
  }, [crewId, updateCrewRules]);

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {localRules.map((rule, index) => (
          <View key={index} style={[styles.ruleCard, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
            <Text style={[styles.ruleNumber, { color: colors.text.secondary }]}>
              {index + 1}.
            </Text>
            <Text style={[styles.ruleText, { color: colors.text.primary }]}>
              {rule}
            </Text>
          </View>
        ))}
      </ScrollView>
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
          <TextInput
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
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
    alignItems: 'flex-start',
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
  crewRuleInput: {
    fontSize: SIZING.font.body,
    height: 40,
    lineHeight: 22,
    paddingVertical: 0,
    paddingHorizontal: 0,
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

