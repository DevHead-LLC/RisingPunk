import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useApplyToCrewMutation, useWithdrawApplicationMutation, useGetCrewStatusQuery, useGetCrewDetailsQuery } from '../../store/api/authApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CREW_MODAL_PADDING = SIZING.spacing.md * 2;
const CREW_CARD_GAP = SIZING.spacing.lg;
const CREW_CARD_WIDTH = ((SCREEN_WIDTH - CREW_MODAL_PADDING - (CREW_CARD_GAP * 2)) / 3) * 0.8;
const CREW_CARD_HEIGHT = CREW_CARD_WIDTH * 0.3;

interface VisitCrewModalProps {
  visible: boolean;
  onClose: () => void;
  crewId: string;
  crewName?: string;
}

type VisitCrewCategory = 
  | 'apply-to-crew'
  | 'awards'
  | 'members'
  | 'external-message-board'
  | null;

const CATEGORIES = [
  { id: 'awards' as VisitCrewCategory, label: 'Awards' },
  { id: 'members' as VisitCrewCategory, label: 'Members' },
  { id: 'external-message-board' as VisitCrewCategory, label: 'External Message Board' },
  { id: 'apply-to-crew' as VisitCrewCategory, label: 'Apply to Crew' },
];

export const VisitCrewModal: React.FC<VisitCrewModalProps> = ({
  visible,
  onClose,
  crewId,
  crewName,
}) => {
  const colors = useThemeColors();
  const [currentCategory, setCurrentCategory] = useState<VisitCrewCategory>(null);
  const isProcessingRef = useRef(false);
  const { data: crewStatus, refetch: refetchCrewStatus } = useGetCrewStatusQuery(undefined, {
    pollingInterval: visible ? 3000 : 0,
  });
  const [applyToCrew, { isLoading: isApplying }] = useApplyToCrewMutation();
  const [withdrawApplication, { isLoading: isWithdrawing }] = useWithdrawApplicationMutation();
  const { data: crewDetails } = useGetCrewDetailsQuery(crewId, {
    skip: !visible || !crewId,
    pollingInterval: visible && crewId ? 3000 : 0,
  });
  const styles = createStyles(colors);
  const isInCrew = crewStatus?.isInCrew || false;
  const currentUserCrewId = crewStatus?.crewId;

  useEffect(() => {
    if (isInCrew && currentUserCrewId && crewId && currentUserCrewId === crewId && visible) {
      onClose();
    }
  }, [isInCrew, currentUserCrewId, crewId, visible, onClose]);

  useEffect(() => {
    if (currentCategory === 'apply-to-crew' && isInCrew && visible) {
      setCurrentCategory(null);
    }
  }, [currentCategory, isInCrew, visible]);

  if (isInCrew && currentUserCrewId && crewId && currentUserCrewId === crewId) {
    return null;
  }

  const isApplied = crewStatus?.appliedCrewId === crewId;

  const handleCategoryPress = (categoryId: VisitCrewCategory) => {
    setCurrentCategory(categoryId);
  };

  const handleBack = () => {
    setCurrentCategory(null);
  };

  const handleClose = () => {
    setCurrentCategory(null);
    onClose();
  };

  const getCategoryLabel = (categoryId: VisitCrewCategory): string => {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    return category?.label || '';
  };

  const handleApplyToggle = useCallback(async () => {
    if (isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    try {
      if (isApplied) {
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
  }, [isApplied, crewId, applyToCrew, withdrawApplication, refetchCrewStatus]);

  const renderAwards = () => {
    return (
      <View style={styles.categoryContent}>
        <View style={styles.awardsEmptyContainer}>
          <Text style={[styles.awardsEmptyText, { color: colors.text.secondary }]}>
            This Crew Has Not Received Any Rewards Yet
          </Text>
        </View>
      </View>
    );
  };

  const renderMembers = () => {
    const president = crewDetails?.crew?.president;
    const executives = crewDetails?.crew?.executives || [];
    const members = crewDetails?.crew?.members || [];

    if (!crewDetails?.crew) {
      return (
        <View style={styles.categoryContent}>
          <Text style={[styles.placeholderText, { color: colors.text.secondary }]}>
            Loading crew information...
          </Text>
        </View>
      );
    }

    const executiveSlots = Array.from({ length: 4 }, (_, index) => executives[index] || null);
    const regularMembers = members.filter((member) => {
      const isExecutive = executives.some((exec) => exec.userId === member.userId);
      const isPresident = president?.userId === member.userId;
      return !isExecutive && !isPresident;
    });

    return (
      <ScrollView
        style={styles.categoryContent}
        contentContainerStyle={styles.membersScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.membersSection}>
          {president && (
            <View style={styles.membersSubsection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                President
              </Text>
              <View style={[
                styles.memberItem,
                {
                  borderColor: colors.secondary,
                  backgroundColor: colors.surface
                }
              ]}>
                <Text style={[
                  styles.memberHandle,
                  { color: colors.text.primary, fontWeight: '600' }
                ]}>
                  {president.handle}
                </Text>
                <Text style={[styles.memberLevel, { color: colors.text.secondary }]}>
                  Lv {president.level || 1}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.membersSubsection}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
              Executives
            </Text>
            <View style={styles.executiveSlots}>
              {executiveSlots.map((executive, index) => (
                <View
                  key={index}
                  style={[
                    styles.memberItem,
                    styles.executiveSlot,
                    {
                      borderColor: colors.secondary,
                      backgroundColor: colors.surface
                    }
                  ]}
                >
                  {executive ? (
                    <>
                      <Text style={[
                        styles.memberHandle,
                        { color: colors.text.primary, fontWeight: '600' }
                      ]}>
                        {executive.handle}
                      </Text>
                      <Text style={[styles.memberLevel, { color: colors.text.secondary }]}>
                        Lv {executive.level || 1}
                      </Text>
                    </>
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          {regularMembers.length > 0 && (
            <View style={styles.membersSubsection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Members
              </Text>
              <View style={styles.membersList}>
                {regularMembers.map((member, index) => (
                  <View
                    key={member.userId}
                    style={[
                      styles.memberItem,
                      styles.memberSlot,
                      {
                        borderColor: colors.secondary,
                        backgroundColor: colors.surface
                      }
                    ]}
                  >
                    <Text style={[styles.memberNumber, { color: colors.text.primary }]}>
                      {index + 1}.
                    </Text>
                    <Text style={[
                      styles.memberHandle,
                      { color: colors.text.primary, fontWeight: '600' }
                    ]}>
                      {member.handle}
                    </Text>
                    <Text style={[styles.memberLevel, { color: colors.text.secondary }]}>
                      Lv {member.level || 1}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderExternalMessageBoard = () => {
    const currentMessage = crewDetails?.crew?.externalMessage || '';

    return (
      <ScrollView
        style={styles.categoryContent}
        contentContainerStyle={styles.externalMessageScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.externalMessageView}>
          {currentMessage ? (
            <Text style={[styles.externalMessageText, { color: colors.text.primary }]}>
              {currentMessage}
            </Text>
          ) : (
            <Text style={[styles.externalMessagePlaceholder, { color: colors.text.secondary }]}>
              No external message has been set yet.
            </Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderCategoryList = () => {
    const visibleCategories = isInCrew 
      ? CATEGORIES.filter(category => category.id !== 'apply-to-crew')
      : CATEGORIES;

    return (
      <SafeAreaView style={styles.visitCrewModalContainer}>
        <View style={styles.visitCrewHeader}>
          <Text style={styles.visitCrewTitle}>
            {crewDetails?.crew?.crewName ? `${crewDetails.crew.crewName} - Crew View` : crewName ? `${crewName} - Crew View` : 'Crew View'}
          </Text>
          <TouchableOpacity
            style={styles.visitCrewCloseButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.visitCrewCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.visitCrewContent} showsVerticalScrollIndicator={false}>
          <View style={styles.visitCrewGridContainer}>
            {visibleCategories.map((category, index) => {
              const isApplyToCrew = category.id === 'apply-to-crew';
              const isLastInRow = !isApplyToCrew && (index + 1) % 3 === 0;
              const fullWidth = (CREW_CARD_WIDTH * 3) + (CREW_CARD_GAP * 2);
              
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    isApplyToCrew ? styles.visitCrewCategoryItemFullWidth : styles.visitCrewCategoryItem,
                    !isLastInRow && !isApplyToCrew && styles.visitCrewCategoryItemMargin,
                    isApplyToCrew && { width: fullWidth }
                  ]}
                  onPress={() => handleCategoryPress(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.visitCrewCategoryText} numberOfLines={2}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderCategoryView = () => {
    if (!currentCategory) return null;

    return (
      <SafeAreaView style={styles.visitCrewModalContainer}>
        <View style={styles.visitCrewHeader}>
          <TouchableOpacity
            style={styles.visitCrewBackButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.visitCrewBackButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.visitCrewTitle}>{getCategoryLabel(currentCategory)}</Text>
          <TouchableOpacity
            style={styles.visitCrewCloseButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.visitCrewCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {currentCategory === 'apply-to-crew' ? (
          <View style={styles.visitCrewCategoryContent}>
            <View style={styles.applyToCrewContainer}>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  {
                    backgroundColor: isApplied ? '#4CAF50' : colors.buttonBg,
                    borderColor: isApplied ? '#4CAF50' : colors.matrix,
                  }
                ]}
                onPress={handleApplyToggle}
                disabled={isApplying || isWithdrawing || isProcessingRef.current}
                activeOpacity={0.7}
              >
                <Text style={[styles.applyButtonText, { color: '#FFFFFF' }]}>
                  {isApplying ? 'Applying...' : isWithdrawing ? 'Withdrawing...' : isApplied ? 'Applied' : 'Apply to Crew'}
                </Text>
                <View style={[styles.buttonCorner, { borderColor: colors.matrix }]} />
              </TouchableOpacity>
            </View>
          </View>
        ) : currentCategory === 'awards' ? renderAwards() :
          currentCategory === 'members' ? renderMembers() :
          currentCategory === 'external-message-board' ? renderExternalMessageBoard() : (
          <View style={styles.visitCrewCategoryContent}>
            <Text style={styles.placeholderText}>
              {getCategoryLabel(currentCategory)} content will be implemented here.
              {'\n\n'}
              Crew ID: {crewId}
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      supportedOrientations={['landscape']}
      presentationStyle="overFullScreen"
    >
      <View style={styles.visitCrewOverlay}>
        {currentCategory ? renderCategoryView() : renderCategoryList()}
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  visitCrewOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  visitCrewModalContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  visitCrewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  visitCrewTitle: {
    color: colors.text.primary,
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  visitCrewCloseButton: {
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
  visitCrewCloseButtonText: {
    color: colors.background,
    fontSize: 28,
    marginTop: -2,
    fontWeight: 'bold',
  },
  visitCrewBackButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 1,
    marginRight: SIZING.spacing.md,
  },
  visitCrewBackButtonText: {
    color: colors.background,
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  visitCrewContent: {
    flex: 1,
    padding: SIZING.spacing.md,
  },
  visitCrewGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  visitCrewCategoryItem: {
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    marginBottom: CREW_CARD_GAP,
    width: CREW_CARD_WIDTH,
    height: CREW_CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitCrewCategoryItemFullWidth: {
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.sm,
    marginBottom: CREW_CARD_GAP,
    height: CREW_CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitCrewCategoryItemMargin: {
    marginRight: CREW_CARD_GAP,
  },
  visitCrewCategoryText: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  visitCrewCategoryContent: {
    flex: 1,
    padding: SIZING.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
  },
  applyToCrewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZING.spacing.lg,
  },
  applyButton: {
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.xl,
    position: 'relative',
    minWidth: 200,
  },
  applyButtonText: {
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
  categoryContent: {
    flex: 1,
    padding: SIZING.spacing.lg,
  },
  awardsEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  awardsEmptyText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  membersScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  membersSection: {
    padding: SIZING.spacing.md,
  },
  membersSubsection: {
    marginBottom: SIZING.spacing.lg,
  },
  membersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm,
  },
  executiveSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZING.spacing.sm,
    marginTop: SIZING.spacing.sm,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
  },
  executiveSlot: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
  },
  memberSlot: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
  },
  memberNumber: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginRight: SIZING.spacing.sm,
    minWidth: 30,
  },
  memberHandle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    flex: 1,
  },
  memberLevel: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
    marginLeft: SIZING.spacing.sm,
  },
  sectionTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  externalMessageScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  externalMessageView: {
    flex: 1,
    padding: SIZING.spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  externalMessageText: {
    fontSize: SIZING.font.body,
    lineHeight: SIZING.font.body * 1.5,
  },
  externalMessagePlaceholder: {
    fontSize: SIZING.font.body,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

