import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Member {
  userId: string;
  handle: string;
  level: number;
}

interface ChooseSuccessorModalProps {
  visible: boolean;
  onClose: () => void;
  onChooseSuccessor: (successorUserId: string) => Promise<void>;
  executives: Member[];
  members: Member[];
  currentPresidentUserId: string;
}

export const ChooseSuccessorModal: React.FC<ChooseSuccessorModalProps> = ({
  visible,
  onClose,
  onChooseSuccessor,
  executives,
  members,
  currentPresidentUserId,
}) => {
  const colors = useThemeColors();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [error, setError] = useState('');

  const eligibleMembers = useMemo(() => {
    const allMembers = [
      ...executives.map(exec => ({ ...exec, role: 'executive' as const })),
      ...members.map(member => ({ ...member, role: 'member' as const }))
    ];
    return allMembers.filter(member => member.userId !== currentPresidentUserId);
  }, [executives, members, currentPresidentUserId]);

  useEffect(() => {
    if (visible) {
      setSelectedUserId(null);
      setError('');
      setIsChoosing(false);
    }
  }, [visible]);

  const handleSelectMember = (userId: string) => {
    if (isChoosing) return;
    setSelectedUserId(userId);
    setError('');
  };

  const handleConfirm = async () => {
    if (!selectedUserId || isChoosing) return;

    setError('');
    setIsChoosing(true);
    try {
      await onChooseSuccessor(selectedUserId);
    } catch (error: any) {
      setError(error?.message || error?.data?.error || 'Failed to choose successor. Please try again.');
    } finally {
      setIsChoosing(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId(null);
    setError('');
    setIsChoosing(false);
    onClose();
  };

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['landscape']}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>CHOOSE SUCCESSOR</Text>
            
            <Text style={styles.descriptionText}>
              Select a member to become the new president. You will automatically become a member of the crew. This action cannot be undone.
            </Text>

            {eligibleMembers.length === 0 && (
              <Text style={styles.warningText}>
                No eligible members available. You must have at least one executive or member in your crew.
              </Text>
            )}

            {eligibleMembers.length > 0 && (
              <View style={styles.membersContainer}>
                {eligibleMembers.map((member) => {
                  const isSelected = selectedUserId === member.userId;
                  return (
                    <TouchableOpacity
                      key={member.userId}
                      style={[
                        styles.memberItem,
                        isSelected && styles.memberItemSelected,
                        {
                          borderColor: isSelected ? colors.primary : colors.secondary,
                          backgroundColor: isSelected ? colors.primary + '20' : colors.surface
                        }
                      ]}
                      onPress={() => handleSelectMember(member.userId)}
                      disabled={isChoosing}
                      activeOpacity={0.7}
                    >
                      <View style={styles.memberInfoContainer}>
                        <Text style={[
                          styles.memberHandle,
                          { color: isSelected ? colors.primary : colors.text.primary, fontWeight: isSelected ? 'bold' : '600' }
                        ]}>
                          {member.handle}
                        </Text>
                        <View style={styles.memberMetaContainer}>
                          <Text style={[styles.memberRole, { color: colors.text.secondary }]}>
                            {member.role === 'executive' ? 'Executive' : 'Member'}
                          </Text>
                          <Text style={[styles.memberLevel, { color: colors.text.secondary }]}>
                            Lv {member.level || 1}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.selectedIndicator}>
                          <Text style={styles.selectedIndicatorText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isChoosing}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedUserId || isChoosing || eligibleMembers.length === 0) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!selectedUserId || isChoosing || eligibleMembers.length === 0}
              activeOpacity={0.7}
            >
              {isChoosing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>CONFIRM SUCCESSOR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    minWidth: 500,
    maxWidth: 700,
    maxHeight: SCREEN_HEIGHT - (SIZING.spacing.lg * 2),
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZING.spacing.sm,
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
  warningText: {
    color: colors.error,
    fontSize: SIZING.font.body,
    textAlign: 'center',
    marginBottom: SIZING.spacing.md,
    fontWeight: '600',
  },
  membersContainer: {
    marginBottom: SIZING.spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
  },
  memberItemSelected: {
    borderWidth: 3,
  },
  memberInfoContainer: {
    flex: 1,
  },
  memberHandle: {
    fontSize: SIZING.font.body,
    marginBottom: SIZING.spacing.xs,
  },
  memberMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZING.spacing.md,
  },
  memberRole: {
    fontSize: SIZING.font.small,
  },
  memberLevel: {
    fontSize: SIZING.font.small,
  },
  selectedIndicator: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZING.spacing.md,
  },
  selectedIndicatorText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.error,
    fontSize: SIZING.font.small,
    marginBottom: SIZING.spacing.md,
    textAlign: 'center',
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
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: SIZING.spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.buttonDisabled,
    borderColor: colors.buttonDisabled,
  },
});

