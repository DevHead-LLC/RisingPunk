import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateBalance } from '../../store/slices/balanceSlice';
import { DisbandCrewModal } from './DisbandCrewModal';
import { VisitingProfileModal } from './VisitingProfileModal';
import { LeaveCrewModal } from './LeaveCrewModal';
import { EditCrewNameModal } from './EditCrewNameModal';
import { EditCrewIdentifierModal } from './EditCrewIdentifierModal';
import { EditCrewLanguageModal } from './EditCrewLanguageModal';
import { GiftAllMembersModal } from './GiftAllMembersModal';
import { EditableCrewRules } from './EditableCrewRules';
import { useDisbandCrewMutation, useGetCrewStatusQuery, useGetCrewDetailsQuery, useAcceptApplicantMutation, useDenyApplicantMutation, useLeaveCrewMutation, useUpdateCrewNameMutation, useUpdateCrewIdentifierMutation, useUpdateCrewLanguageMutation, useGiftAllMembersMutation, usePromoteMemberMutation, useDemoteExecutiveMutation } from '../../store/api/authApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CREW_MODAL_PADDING = SIZING.spacing.md * 2;
const CREW_CARD_GAP = SIZING.spacing.lg;
const CREW_CARD_WIDTH = ((SCREEN_WIDTH - CREW_MODAL_PADDING - (CREW_CARD_GAP * 2)) / 3) * 0.8;
const CREW_CARD_HEIGHT = CREW_CARD_WIDTH * 0.3;

const SETTINGS_BUTTON_GAP = SIZING.spacing.lg;
const SETTINGS_BUTTON_WIDTH = (SCREEN_WIDTH / 3);

interface CrewModalProps {
  visible: boolean;
  onClose: () => void;
}

type CrewCategory = 
  | 'guild-information'
  | 'members'
  | 'awards'
  | 'crew-settings'
  | 'recruiting'
  | 'crew-rules'
  | 'ranking'
  | 'internal-message-board'
  | 'external-message-board'
  | null;

const CATEGORIES = [
  { id: 'guild-information' as CrewCategory, label: 'Crew Information' },
  { id: 'members' as CrewCategory, label: 'Members' },
  { id: 'awards' as CrewCategory, label: 'Awards' },
  { id: 'crew-settings' as CrewCategory, label: 'Crew Settings' },
  { id: 'recruiting' as CrewCategory, label: 'Recruiting' },
  { id: 'crew-rules' as CrewCategory, label: 'Crew Rules' },
  { id: 'ranking' as CrewCategory, label: 'Ranking' },
  { id: 'internal-message-board' as CrewCategory, label: 'Internal Message Board' },
  { id: 'external-message-board' as CrewCategory, label: 'External Message Board' },
];

export const CrewModal: React.FC<CrewModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const [currentCategory, setCurrentCategory] = useState<CrewCategory>(null);
  const [showDisbandModal, setShowDisbandModal] = useState(false);
  const [showLeaveCrewModal, setShowLeaveCrewModal] = useState(false);
  const [showEditCrewNameModal, setShowEditCrewNameModal] = useState(false);
  const [showEditCrewIdentifierModal, setShowEditCrewIdentifierModal] = useState(false);
  const [showEditCrewLanguageModal, setShowEditCrewLanguageModal] = useState(false);
  const [showGiftAllMembersModal, setShowGiftAllMembersModal] = useState(false);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [demotingUserId, setDemotingUserId] = useState<string | null>(null);
  const [recentlyPromotedUserIds, setRecentlyPromotedUserIds] = useState<Set<string>>(new Set());
  const [isEditingCrewRules, setIsEditingCrewRules] = useState(false);
  const { data: crewStatus, refetch: refetchCrewStatus } = useGetCrewStatusQuery(undefined, {
    pollingInterval: visible ? 3000 : 0,
  });
  const [disbandCrew, { isLoading: isDisbanding }] = useDisbandCrewMutation();
  const [acceptApplicant, { isLoading: isAccepting }] = useAcceptApplicantMutation();
  const [denyApplicant, { isLoading: isDenying }] = useDenyApplicantMutation();
  const [leaveCrew, { isLoading: isLeaving }] = useLeaveCrewMutation();
  const [updateCrewName, { isLoading: isUpdatingCrewName }] = useUpdateCrewNameMutation();
  const [updateCrewIdentifier, { isLoading: isUpdatingCrewIdentifier }] = useUpdateCrewIdentifierMutation();
  const [updateCrewLanguage, { isLoading: isUpdatingCrewLanguage }] = useUpdateCrewLanguageMutation();
  const [giftAllMembers, { isLoading: isGiftingMembers }] = useGiftAllMembersMutation();
  const [promoteMember] = usePromoteMemberMutation();
  const [demoteExecutive] = useDemoteExecutiveMutation();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentBalanceState = useAppSelector((state) => state.balance);
  
  const userRole = crewStatus?.role;
  const currentUserId = currentUser?._id;
  
  const { data: crewDetails, refetch: refetchCrewDetails } = useGetCrewDetailsQuery(
    crewStatus?.crewId || '',
    { 
      skip: !crewStatus?.crewId || !visible || !crewStatus?.isInCrew,
      pollingInterval: visible && crewStatus?.crewId && crewStatus?.isInCrew ? 3000 : 0,
    }
  );
  
  const activeCrewDetails = crewDetails;
  const executives = activeCrewDetails?.crew?.executives || [];
  const members = activeCrewDetails?.crew?.members || [];
  const president = activeCrewDetails?.crew?.president;
  const isExecutive = currentUserId && executives.some((exec: any) => String(exec.userId) === String(currentUserId));
  
  const regularMembers = useMemo(() => {
    if (!members || !executives || !president) return [];
    return members.filter((member) => {
      const isExecutive = executives.some((exec: any) => exec.userId === member.userId);
      const isPresident = president?.userId === member.userId;
      return !isExecutive && !isPresident;
    });
  }, [members, executives, president]);

  const giftRecipientCount = useMemo(() => {
    if (!members || !executives || !president || !currentUserId) return 0;
    const presidentUserId = president.userId;
    const executivesExcludingPresident = executives.filter((exec: any) => String(exec.userId) !== String(presidentUserId));
    const membersExcludingPresident = members.filter((member: any) => String(member.userId) !== String(presidentUserId));
    return executivesExcludingPresident.length + membersExcludingPresident.length;
  }, [members, executives, president, currentUserId]);

  useEffect(() => {
    setRecentlyPromotedUserIds(prev => {
      if (prev.size === 0) return prev;
      const memberUserIds = new Set(regularMembers.map(m => m.userId));
      const executiveUserIds = new Set(executives.map((exec: any) => exec.userId));
      let hasChanges = false;
      const next = new Set(prev);
      prev.forEach(userId => {
        if (!memberUserIds.has(userId) || executiveUserIds.has(userId)) {
          next.delete(userId);
          hasChanges = true;
        }
      });
      return hasChanges ? next : prev;
    });
  }, [regularMembers, executives]);

  const styles = createStyles(colors);

  const handleCategoryPress = (categoryId: CrewCategory) => {
    setCurrentCategory(categoryId);
  };

  const handleBack = () => {
    setCurrentCategory(null);
  };

  const handleClose = () => {
    setCurrentCategory(null);
    setShowDisbandModal(false);
    setShowLeaveCrewModal(false);
    setShowEditCrewNameModal(false);
    setShowEditCrewIdentifierModal(false);
    setShowEditCrewLanguageModal(false);
    setShowGiftAllMembersModal(false);
    setViewingProfileUserId(null);
    setPromotingUserId(null);
    setDemotingUserId(null);
    setRecentlyPromotedUserIds(new Set());
    setIsEditingCrewRules(false);
    onClose();
  };

  const handleDisbandCrewPress = useCallback(() => {
    setShowDisbandModal(true);
  }, []);

  const handleDisbandCrew = useCallback(async (crewIdentifier: string) => {
    try {
      await disbandCrew({ crewIdentifier }).unwrap();
      await refetchCrewStatus();
      setShowDisbandModal(false);
      setCurrentCategory(null);
      onClose();
    } catch (error: any) {
      throw new Error(error?.data?.error || error?.error || 'Failed to disband crew');
    }
  }, [disbandCrew, refetchCrewStatus, onClose]);

  const getCategoryLabel = (categoryId: CrewCategory): string => {
    const category = CATEGORIES.find(cat => cat.id === categoryId);
    return category?.label || '';
  };

  const getVisibleCategories = (): typeof CATEGORIES => {
    const userRole = crewStatus?.role;
    const currentUserId = currentUser?._id;
    const executives = activeCrewDetails?.crew?.executives || [];
    const isExecutive = currentUserId && executives.some(exec => String(exec.userId) === String(currentUserId));
    
    if (!userRole) {
      return CATEGORIES.filter(cat => 
        cat.id !== 'crew-settings' && cat.id !== 'recruiting'
      );
    }
    
    if (userRole === 'president') {
      return CATEGORIES;
    }
    
    if (isExecutive) {
      return CATEGORIES.filter(cat => cat.id !== 'crew-settings');
    }
    
    if (userRole === 'member') {
      return CATEGORIES.filter(cat => 
        cat.id !== 'crew-settings' && cat.id !== 'recruiting'
      );
    }
    
    return CATEGORIES.filter(cat => 
      cat.id !== 'crew-settings' && cat.id !== 'recruiting'
    );
  };

  const handleAcceptApplicant = useCallback(async (applicantUserId: string) => {
    if (!crewStatus?.crewId) {
      return;
    }

    try {
      await acceptApplicant({
        crewId: crewStatus.crewId,
        applicantUserId,
      }).unwrap();
      await refetchCrewDetails();
      await refetchCrewStatus();
    } catch (error: any) {
      console.error('Error accepting applicant:', error);
    }
  }, [acceptApplicant, crewStatus?.crewId, refetchCrewDetails, refetchCrewStatus]);

  const handleDenyApplicant = useCallback(async (applicantUserId: string) => {
    if (!crewStatus?.crewId) {
      return;
    }

    try {
      await denyApplicant({
        crewId: crewStatus.crewId,
        applicantUserId,
      }).unwrap();
      await refetchCrewDetails();
      await refetchCrewStatus();
    } catch (error: any) {
      console.error('Error denying applicant:', error);
    }
  }, [denyApplicant, crewStatus?.crewId, refetchCrewDetails, refetchCrewStatus]);

  const hasApplicants = useMemo(() => {
    return (activeCrewDetails?.crew?.applicants?.length || 0) > 0;
  }, [activeCrewDetails?.crew?.applicants?.length]);

  const handleLeaveCrewPress = useCallback(() => {
    setShowLeaveCrewModal(true);
  }, []);

  const handleLeaveCrew = useCallback(async () => {
    try {
      setShowLeaveCrewModal(false);
      setCurrentCategory(null);
      await leaveCrew().unwrap();
      onClose();
      await refetchCrewStatus();
    } catch (error: any) {
      setShowLeaveCrewModal(true);
      throw new Error(error?.data?.error || error?.error || 'Failed to leave crew');
    }
  }, [leaveCrew, refetchCrewStatus, onClose]);

  const handleEditCrewNamePress = useCallback(() => {
    setShowEditCrewNameModal(true);
  }, []);

  const handleUpdateCrewName = useCallback(async (crewName: string) => {
    try {
      await updateCrewName({ crewName }).unwrap();
      await refetchCrewDetails();
      await refetchCrewStatus();
      setShowEditCrewNameModal(false);
    } catch (error: any) {
      throw new Error(error?.data?.error || error?.error || 'Failed to update crew name');
    }
  }, [updateCrewName, refetchCrewDetails, refetchCrewStatus]);

  const handleEditCrewIdentifierPress = useCallback(() => {
    setShowEditCrewIdentifierModal(true);
  }, []);

  const handleUpdateCrewIdentifier = useCallback(async (crewIdentifier: string) => {
    try {
      await updateCrewIdentifier({ crewIdentifier }).unwrap();
      await refetchCrewDetails();
      await refetchCrewStatus();
      setShowEditCrewIdentifierModal(false);
    } catch (error: any) {
      throw new Error(error?.data?.error || error?.error || 'Failed to update crew identifier');
    }
  }, [updateCrewIdentifier, refetchCrewDetails, refetchCrewStatus]);

  const handleEditCrewLanguagePress = useCallback(() => {
    setShowEditCrewLanguageModal(true);
  }, []);

  const handleUpdateCrewLanguage = useCallback(async (nativeLanguage: string) => {
    try {
      await updateCrewLanguage({ nativeLanguage }).unwrap();
      await refetchCrewDetails();
      await refetchCrewStatus();
      setShowEditCrewLanguageModal(false);
    } catch (error: any) {
      throw new Error(error?.data?.error || error?.error || 'Failed to update crew language');
    }
  }, [updateCrewLanguage, refetchCrewDetails, refetchCrewStatus]);

  const handleGiftAllMembersPress = useCallback(() => {
    setShowGiftAllMembersModal(true);
  }, []);

  const handleGiftAllMembers = useCallback(async (giftAmount: number) => {
    try {
      const result = await giftAllMembers({ giftAmount }).unwrap();
      
      if (result.newBalance !== undefined) {
        dispatch(updateBalance({ 
          total: result.newBalance, 
          ratePerSecond: currentBalanceState.ratePerSecond, 
          lastUpdated: result.lastUpdated || new Date(),
          fractionalRemainder: result.fractionalRemainder !== undefined ? result.fractionalRemainder : 0
        }));
      }

      try {
        await refetchCrewDetails();
      } catch (refetchError) {
        console.warn('Failed to refetch crew details after gift:', refetchError);
      }

      try {
        await refetchCrewStatus();
      } catch (refetchError) {
        console.warn('Failed to refetch crew status after gift:', refetchError);
      }
    } catch (error: any) {
      throw new Error(error?.data?.error || error?.error || 'Failed to gift members');
    }
  }, [giftAllMembers, refetchCrewDetails, refetchCrewStatus, dispatch, currentBalanceState]);

  const handlePromoteMember = useCallback(async (memberUserId: string) => {
    if (!crewStatus?.crewId) {
      return;
    }

    setPromotingUserId(memberUserId);
    setRecentlyPromotedUserIds(prev => new Set(prev).add(memberUserId));
    try {
      await promoteMember({
        crewId: crewStatus.crewId,
        memberUserId,
      }).unwrap();
      await refetchCrewDetails();
      await refetchCrewStatus();
    } catch (error: any) {
      console.error('Error promoting member:', error);
      setRecentlyPromotedUserIds(prev => {
        const next = new Set(prev);
        next.delete(memberUserId);
        return next;
      });
    } finally {
      setPromotingUserId(null);
    }
  }, [promoteMember, crewStatus?.crewId, refetchCrewDetails, refetchCrewStatus]);

  const handleDemoteExecutive = useCallback(async (executiveUserId: string) => {
    if (!crewStatus?.crewId) {
      return;
    }

    setDemotingUserId(executiveUserId);
    try {
      await demoteExecutive({
        crewId: crewStatus.crewId,
        executiveUserId,
      }).unwrap();
      await refetchCrewDetails();
      await refetchCrewStatus();
    } catch (error: any) {
      console.error('Error demoting executive:', error);
    } finally {
      setDemotingUserId(null);
    }
  }, [demoteExecutive, crewStatus?.crewId, refetchCrewDetails, refetchCrewStatus]);

  const renderCategoryList = () => {
    if (!crewStatus?.isInCrew || !activeCrewDetails?.crew) {
      return (
        <SafeAreaView style={styles.crewModalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Crew System</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={[styles.placeholderText, { color: colors.text.secondary }]}>
              Loading crew information...
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    const crewName = activeCrewDetails.crew.crewName || '';
    const crewIdentifier = crewStatus?.crewIdentifier || activeCrewDetails.crew.crewIdentifier || '';
    const title = crewName && crewIdentifier 
      ? `${crewName} (${crewIdentifier})` 
      : crewName || crewIdentifier || 'Crew System';

    const executives = activeCrewDetails.crew.executives || [];
    const members = activeCrewDetails.crew.members || [];
    const president = activeCrewDetails.crew.president;
    
    const isLoggedInUser = (memberUserId: string): boolean => {
      if (!memberUserId || !currentUserId) {
        return false;
      }
      const loggedInUserIdString = String(currentUserId).trim();
      const memberUserIdString = String(memberUserId).trim();
      return loggedInUserIdString === memberUserIdString;
    };

    const isCurrentUserPresident = userRole === 'president' || (president?.userId && isLoggedInUser(president.userId));
    const isCurrentUserExecutive = executives.some((exec) => exec.userId && isLoggedInUser(exec.userId));
    const isCurrentUserMember = userRole === 'member' || members.some((member) => member.userId && isLoggedInUser(member.userId));
    const showLeaveCrewButton = (isCurrentUserExecutive || isCurrentUserMember) && !isCurrentUserPresident;

    const visibleCategories = getVisibleCategories();
    const totalItems = visibleCategories.length + (showLeaveCrewButton ? 1 : 0);

    return (
      <SafeAreaView style={styles.crewModalContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.crewGridContainer}>
            {visibleCategories.map((category, index) => {
              const isLastInRow = (index + 1) % 3 === 0;
              const showNotificationDot = category.id === 'recruiting' && hasApplicants;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.crewCategoryItem,
                    !isLastInRow && styles.crewCategoryItemMargin
                  ]}
                  onPress={() => handleCategoryPress(category.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.crewCategoryText} numberOfLines={2}>
                    {category.label}
                  </Text>
                  {showNotificationDot && (
                    <View style={styles.notificationDot} />
                  )}
                </TouchableOpacity>
              );
            })}
            {showLeaveCrewButton && (
              <TouchableOpacity
                style={[
                  styles.crewCategoryItem,
                  styles.leaveCrewCategoryItem,
                  (totalItems - 1) % 3 !== 0 && styles.crewCategoryItemMargin
                ]}
                onPress={handleLeaveCrewPress}
                activeOpacity={0.7}
              >
                <Text style={[styles.crewCategoryText, styles.leaveCrewCategoryText]} numberOfLines={2}>
                  Leave Crew
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderRecruiting = () => {
    const applicants = activeCrewDetails?.crew?.applicants || [];

    return (
      <ScrollView
        style={styles.categoryContent}
        contentContainerStyle={styles.recruitingScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.recruitingSection}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Applicants
          </Text>
          {applicants.length > 0 ? (
            <View style={styles.applicantsList}>
              {applicants.map((applicant, index) => (
                <View
                  key={applicant.userId}
                  style={[
                    styles.applicantItem,
                    { borderColor: colors.secondary, backgroundColor: colors.surface }
                  ]}
                >
                  <Text style={[styles.applicantNumber, { color: colors.text.primary }]}>
                    {index + 1}.
                  </Text>
                  <Text style={[styles.applicantHandle, { color: colors.text.primary }]}>
                    {applicant.handle}
                  </Text>
                  <View style={styles.applicantButtons}>
                    <TouchableOpacity
                      style={[
                        styles.applicantButton,
                        styles.applicantButtonAccept,
                        { borderColor: '#4CAF50', backgroundColor: '#4CAF50' }
                      ]}
                      onPress={() => handleAcceptApplicant(applicant.userId)}
                      disabled={isAccepting}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.applicantButtonText, { color: '#FFFFFF' }]}>
                        {isAccepting ? 'Accepting...' : 'Accept'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.applicantButton,
                        styles.applicantButtonDeny,
                        { borderColor: colors.error, backgroundColor: colors.error }
                      ]}
                      onPress={() => handleDenyApplicant(applicant.userId)}
                      disabled={isDenying}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.applicantButtonText, { color: '#FFFFFF' }]}>
                        {isDenying ? 'Denying...' : 'Deny'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.applicantButton,
                        styles.applicantButtonView,
                        { borderColor: colors.secondary, backgroundColor: colors.surface }
                      ]}
                      onPress={() => {
                        setViewingProfileUserId(applicant.userId);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.applicantButtonText, { color: colors.text.primary }]}>
                        View
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noApplicantsText, { color: colors.text.secondary }]}>
              No applicants at this time.
            </Text>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderMembers = () => {
    if (!activeCrewDetails?.crew) {
      return (
        <View style={styles.categoryContent}>
          <Text style={[styles.placeholderText, { color: colors.text.secondary }]}>
            Loading crew information...
          </Text>
        </View>
      );
    }

    const loggedInUserId = currentUser?._id;

    const executiveSlots = Array.from({ length: 4 }, (_, index) => executives[index] || null);
    const executiveUserIds = new Set(executives.map((exec: any) => exec.userId));
    const pendingPromotedCount = Array.from(recentlyPromotedUserIds).filter(
      userId => !executiveUserIds.has(userId)
    ).length;
    const effectiveExecutivesCount = executives.length + pendingPromotedCount;

    const isLoggedInUser = (memberUserId: string): boolean => {
      if (!memberUserId || !loggedInUserId) {
        return false;
      }
      const loggedInUserIdString = String(loggedInUserId).trim();
      const memberUserIdString = String(memberUserId).trim();
      return loggedInUserIdString === memberUserIdString;
    };

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
                  borderColor: isLoggedInUser(president.userId) ? colors.primary : colors.secondary,
                  backgroundColor: isLoggedInUser(president.userId) ? colors.primary + '20' : colors.surface
                }
              ]}>
                <Text style={[
                  styles.memberHandle,
                  { color: isLoggedInUser(president.userId) ? colors.primary : colors.text.primary, fontWeight: isLoggedInUser(president.userId) ? 'bold' : '600' }
                ]}>
                  {president.handle}
                  {isLoggedInUser(president.userId) && (
                    <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
                  )}
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
                      borderColor: executive && isLoggedInUser(executive.userId) ? colors.primary : colors.secondary,
                      backgroundColor: executive && isLoggedInUser(executive.userId) ? colors.primary + '20' : colors.surface
                    }
                  ]}
                >
                  {executive ? (
                    <>
                      <View style={styles.memberInfoContainer}>
                        <Text style={[
                          styles.memberHandle,
                          { color: isLoggedInUser(executive.userId) ? colors.primary : colors.text.primary, fontWeight: isLoggedInUser(executive.userId) ? 'bold' : '600' }
                        ]}>
                          {executive.handle}
                          {isLoggedInUser(executive.userId) && (
                            <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
                          )}
                        </Text>
                        <Text style={[styles.memberLevel, { color: colors.text.secondary }]}>
                          Lv {executive.level || 1}
                        </Text>
                      </View>
                      {userRole === 'president' && (
                        <TouchableOpacity
                          style={[
                            styles.memberActionButton,
                            { borderColor: colors.error, backgroundColor: colors.error }
                          ]}
                          onPress={() => handleDemoteExecutive(executive.userId)}
                          disabled={demotingUserId === executive.userId}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.memberActionButtonText, { color: '#FFFFFF' }]}>
                            {demotingUserId === executive.userId ? 'Demoting...' : 'Demote'}
                          </Text>
                        </TouchableOpacity>
                      )}
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
                        borderColor: isLoggedInUser(member.userId) ? colors.primary : colors.secondary,
                        backgroundColor: isLoggedInUser(member.userId) ? colors.primary + '20' : colors.surface
                      }
                    ]}
                  >
                    <Text style={[styles.memberNumber, { color: colors.text.primary }]}>
                      {index + 1}.
                    </Text>
                    <View style={styles.memberInfoContainer}>
                      <Text style={[
                        styles.memberHandle,
                        { color: isLoggedInUser(member.userId) ? colors.primary : colors.text.primary, fontWeight: isLoggedInUser(member.userId) ? 'bold' : '600' }
                      ]}>
                        {member.handle}
                        {isLoggedInUser(member.userId) && (
                          <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
                        )}
                      </Text>
                      <Text style={[styles.memberLevel, { color: colors.text.secondary }]}>
                        Lv {member.level || 1}
                      </Text>
                    </View>
                    {userRole === 'president' && effectiveExecutivesCount < 4 && (
                      <TouchableOpacity
                        style={[
                          styles.memberActionButton,
                          { borderColor: '#4CAF50', backgroundColor: '#4CAF50' }
                        ]}
                        onPress={() => handlePromoteMember(member.userId)}
                        disabled={promotingUserId === member.userId || recentlyPromotedUserIds.has(member.userId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.memberActionButtonText, { color: '#FFFFFF' }]}>
                          {promotingUserId === member.userId || recentlyPromotedUserIds.has(member.userId) ? 'Promoting...' : 'Promote'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderCrewInformation = () => {
    const crew = activeCrewDetails?.crew;
    if (!crew) {
      return (
        <View style={styles.categoryContent}>
          <Text style={[styles.placeholderText, { color: colors.text.secondary }]}>
            Loading crew information...
          </Text>
        </View>
      );
    }

    const formatDate = (dateString: string | null) => {
      if (!dateString) return 'Unknown';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return 'Unknown';
      }
    };

    return (
      <ScrollView
        style={styles.categoryContent}
        contentContainerStyle={styles.crewInfoScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.crewInfoSection}>
          <View style={[styles.infoItem, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Crew Name
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {crew.crewName}
            </Text>
          </View>

          <View style={[styles.infoItem, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Crew Identifier
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {crew.crewIdentifier}
            </Text>
          </View>

          <View style={[styles.infoItem, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Primary Language
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {crew.nativeLanguage}
            </Text>
          </View>

          <View style={[styles.infoItem, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Members
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {crew.memberCount}
            </Text>
          </View>

          <View style={[styles.infoItem, { borderColor: colors.secondary, backgroundColor: colors.surface }]}>
            <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
              Created
            </Text>
            <Text style={[styles.infoValue, { color: colors.text.primary }]}>
              {formatDate(crew.createdAt)}
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderRanking = () => {
    const president = activeCrewDetails?.crew?.president;
    const executives = activeCrewDetails?.crew?.executives || [];
    const members = activeCrewDetails?.crew?.members || [];
    const loggedInUserId = currentUser?._id;

    const sortedExecutives = [...executives].sort((a, b) => (b.level || 1) - (a.level || 1));
    const regularMembers = members.filter((member) => {
      const isExecutive = executives.some((exec) => exec.userId === member.userId);
      const isPresident = president?.userId === member.userId;
      return !isExecutive && !isPresident;
    });
    const sortedMembers = [...regularMembers].sort((a, b) => (b.level || 1) - (a.level || 1));

    const isLoggedInUser = (memberUserId: string): boolean => {
      if (!memberUserId || !loggedInUserId) {
        return false;
      }
      const loggedInUserIdString = String(loggedInUserId).trim();
      const memberUserIdString = String(memberUserId).trim();
      return loggedInUserIdString === memberUserIdString;
    };

    return (
      <ScrollView
        style={styles.categoryContent}
        contentContainerStyle={styles.rankingScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rankingSection}>
          {president && (
            <View style={styles.rankingSubsection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                President
              </Text>
              <View style={[
                styles.rankingItem,
                {
                  borderColor: isLoggedInUser(president.userId) ? colors.primary : colors.secondary,
                  backgroundColor: isLoggedInUser(president.userId) ? colors.primary + '20' : colors.surface
                }
              ]}>
                <Text style={[styles.rankingRank, { color: colors.text.primary }]}>
                  1.
                </Text>
                <Text style={[
                  styles.rankingHandle,
                  { color: isLoggedInUser(president.userId) ? colors.primary : colors.text.primary, fontWeight: isLoggedInUser(president.userId) ? 'bold' : '600' }
                ]}>
                  {president.handle}
                  {isLoggedInUser(president.userId) && (
                    <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
                  )}
                </Text>
                <Text style={[styles.rankingLevel, { color: colors.text.secondary }]}>
                  Lv {president.level || 1}
                </Text>
              </View>
            </View>
          )}

          {sortedExecutives.length > 0 && (
            <View style={styles.rankingSubsection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Executives
              </Text>
              <View style={styles.rankingList}>
                {sortedExecutives.map((executive, index) => (
                  <View
                    key={executive.userId}
                    style={[
                      styles.rankingItem,
                      {
                        borderColor: isLoggedInUser(executive.userId) ? colors.primary : colors.secondary,
                        backgroundColor: isLoggedInUser(executive.userId) ? colors.primary + '20' : colors.surface
                      }
                    ]}
                  >
                    <Text style={[styles.rankingRank, { color: colors.text.primary }]}>
                      {index + 2}.
                    </Text>
                    <Text style={[
                      styles.rankingHandle,
                      { color: isLoggedInUser(executive.userId) ? colors.primary : colors.text.primary, fontWeight: isLoggedInUser(executive.userId) ? 'bold' : '600' }
                    ]}>
                      {executive.handle}
                      {isLoggedInUser(executive.userId) && (
                        <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
                      )}
                    </Text>
                    <Text style={[styles.rankingLevel, { color: colors.text.secondary }]}>
                      Lv {executive.level || 1}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {sortedMembers.length > 0 && (
            <View style={styles.rankingSubsection}>
              <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                Members
              </Text>
              <View style={styles.rankingList}>
                {sortedMembers.map((member, index) => {
                  const rankNumber = president ? 2 + sortedExecutives.length + index : 1 + sortedExecutives.length + index;
                  return (
                    <View
                      key={member.userId}
                      style={[
                        styles.rankingItem,
                        {
                          borderColor: isLoggedInUser(member.userId) ? colors.primary : colors.secondary,
                          backgroundColor: isLoggedInUser(member.userId) ? colors.primary + '20' : colors.surface
                        }
                      ]}
                    >
                      <Text style={[styles.rankingRank, { color: colors.text.primary }]}>
                        {rankNumber}.
                      </Text>
                      <Text style={[
                        styles.rankingHandle,
                        { color: isLoggedInUser(member.userId) ? colors.primary : colors.text.primary, fontWeight: isLoggedInUser(member.userId) ? 'bold' : '600' }
                      ]}>
                        {member.handle}
                        {isLoggedInUser(member.userId) && (
                          <Text style={[styles.youLabel, { color: colors.primary }]}> (You)</Text>
                        )}
                      </Text>
                      <Text style={[styles.rankingLevel, { color: colors.text.secondary }]}>
                        Lv {member.level || 1}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

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

  const renderCrewRules = () => {
    const isPresident = userRole === 'president';
    const crewRules = activeCrewDetails?.crew?.crewRules || [];
    const crewId = crewStatus?.crewId;

    if (!crewId || typeof crewId !== 'string' || crewId.trim() === '') {
      return (
        <View style={styles.categoryContent}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Unable to load crew rules: Invalid crew ID
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.categoryContent}>
        {isPresident && (
          <View style={styles.crewRulesEditContainer}>
            <TouchableOpacity
              style={[
                styles.crewRulesEditButton,
                { 
                  borderColor: isEditingCrewRules ? colors.error : colors.primary, 
                  backgroundColor: isEditingCrewRules ? colors.error : colors.primary 
                }
              ]}
              onPress={() => {
                setIsEditingCrewRules(!isEditingCrewRules);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.crewRulesEditButtonText, { color: colors.background }]}>
                {isEditingCrewRules ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <EditableCrewRules
          crewId={crewId}
          crewRules={crewRules}
          isEditing={isEditingCrewRules}
          onEditingChange={setIsEditingCrewRules}
        />
      </View>
    );
  };

  const renderCrewSettings = () => {
    const settingsButtons = [
      'Edit Crew Name',
      'Edit Crew Identifier',
      'Change Language',
      'Gift All Members',
      'Declare War',
      'Terminate War Declaration',
      'Request Alliance',
      'Accept Alliance',
      'Terminate Alliance',
      'Choose Successor',
      'Resign',
      'Disband Crew',
    ];

    return (
      <ScrollView 
        style={styles.categoryContent}
        contentContainerStyle={styles.settingsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.settingsButtonGrid}>
          {settingsButtons.map((buttonText, index) => {
            const isLeftButton = index % 2 === 0;
            const isLastThree = index >= 9;
            const isDisbandCrew = index === 11;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.settingsButton,
                  !isLeftButton && styles.settingsButtonRight,
                  isLastThree && styles.settingsButtonDanger,
                  isDisbandCrew && styles.settingsButtonDisband
                ]}
                onPress={() => {
                  if (buttonText === 'Edit Crew Name') {
                    handleEditCrewNamePress();
                  } else if (buttonText === 'Edit Crew Identifier') {
                    handleEditCrewIdentifierPress();
                  } else if (buttonText === 'Change Language') {
                    handleEditCrewLanguagePress();
                  } else if (buttonText === 'Gift All Members') {
                    handleGiftAllMembersPress();
                  } else if (isDisbandCrew) {
                    handleDisbandCrewPress();
                  } else {
                    console.log(`${buttonText} pressed`);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.settingsButtonText,
                  isLastThree && styles.settingsButtonDangerText
                ]}>
                  {buttonText.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderCategoryView = () => {
    if (!currentCategory) return null;

    return (
      <SafeAreaView style={styles.crewModalContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{getCategoryLabel(currentCategory)}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {currentCategory === 'crew-settings' ? renderCrewSettings() : 
         currentCategory === 'recruiting' ? renderRecruiting() : 
         currentCategory === 'members' ? renderMembers() :
         currentCategory === 'guild-information' ? renderCrewInformation() :
         currentCategory === 'awards' ? renderAwards() :
         currentCategory === 'ranking' ? renderRanking() :
         currentCategory === 'crew-rules' ? renderCrewRules() : (
          <View style={styles.categoryContent}>
            <Text style={styles.placeholderText}>
              {getCategoryLabel(currentCategory)} content will be implemented here.
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  };

  if (!visible || !crewStatus?.isInCrew) {
    return null;
  }

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
      <View style={styles.overlay}>
        {currentCategory ? renderCategoryView() : renderCategoryList()}
      </View>

      {crewStatus?.crewIdentifier && (
        <DisbandCrewModal
          visible={showDisbandModal}
          onClose={() => setShowDisbandModal(false)}
          onDisband={handleDisbandCrew}
          crewIdentifier={crewStatus.crewIdentifier}
        />
      )}

      <LeaveCrewModal
        visible={showLeaveCrewModal}
        onClose={() => setShowLeaveCrewModal(false)}
        onLeave={handleLeaveCrew}
      />

      {viewingProfileUserId && (
        <VisitingProfileModal
          visible={!!viewingProfileUserId}
          onClose={() => setViewingProfileUserId(null)}
          userId={viewingProfileUserId}
        />
      )}

      {activeCrewDetails?.crew?.crewName && (
        <EditCrewNameModal
          visible={showEditCrewNameModal}
          onClose={() => setShowEditCrewNameModal(false)}
          onUpdate={handleUpdateCrewName}
          currentCrewName={activeCrewDetails.crew.crewName}
        />
      )}

      {crewStatus?.crewIdentifier && (
        <EditCrewIdentifierModal
          visible={showEditCrewIdentifierModal}
          onClose={() => setShowEditCrewIdentifierModal(false)}
          onUpdate={handleUpdateCrewIdentifier}
          currentCrewIdentifier={crewStatus.crewIdentifier}
        />
      )}

      {activeCrewDetails?.crew?.nativeLanguage && (
        <EditCrewLanguageModal
          visible={showEditCrewLanguageModal}
          onClose={() => setShowEditCrewLanguageModal(false)}
          onUpdate={handleUpdateCrewLanguage}
          currentLanguage={activeCrewDetails.crew.nativeLanguage}
        />
      )}

      {activeCrewDetails?.crew && (
        <GiftAllMembersModal
          visible={showGiftAllMembersModal}
          onClose={() => setShowGiftAllMembersModal(false)}
          onGift={handleGiftAllMembers}
          memberCount={giftRecipientCount}
        />
      )}
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
  crewModalContainer: {
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
  backButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
    borderWidth: 1,
    marginRight: SIZING.spacing.md,
  },
  backButtonText: {
    color: colors.background,
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: SIZING.spacing.md,
  },
  crewGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  crewCategoryItem: {
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
    position: 'relative',
  },
  crewCategoryItemMargin: {
    marginRight: CREW_CARD_GAP,
  },
  crewCategoryText: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  leaveCrewCategoryItem: {
    borderColor: colors.error,
  },
  leaveCrewCategoryText: {
    color: colors.error,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
    borderWidth: 1,
    borderColor: colors.background,
  },
  categoryContent: {
    flex: 1,
    padding: SIZING.spacing.lg,
  },
  placeholderText: {
    color: colors.text.secondary,
    fontSize: SIZING.font.body,
    textAlign: 'center',
  },
  settingsScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  settingsButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  settingsButton: {
    width: SETTINGS_BUTTON_WIDTH,
    backgroundColor: colors.surface,
    borderColor: colors.secondary,
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SETTINGS_BUTTON_GAP,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50,
  },
  settingsButtonRight: {
    marginLeft: SETTINGS_BUTTON_GAP,
  },
  settingsButtonDanger: {
    backgroundColor: colors.error + '40',
  },
  settingsButtonDisband: {
    borderColor: colors.error,
  },
  settingsButtonText: {
    color: colors.text.primary,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsButtonDangerText: {
    color: '#FFFFFF',
  },
  recruitingScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  recruitingSection: {
    padding: SIZING.spacing.md,
  },
  sectionTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  applicantsList: {
    marginTop: SIZING.spacing.sm,
  },
  applicantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
  },
  applicantNumber: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginRight: SIZING.spacing.sm,
    minWidth: 30,
  },
  applicantHandle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    flex: 1,
  },
  applicantButtons: {
    flexDirection: 'row',
    gap: SIZING.spacing.sm,
  },
  applicantButton: {
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  applicantButtonAccept: {
    // Styling handled inline
  },
  applicantButtonDeny: {
    // Styling handled inline
  },
  applicantButtonView: {
    // Styling handled inline
  },
  applicantButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
  },
  noApplicantsText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    padding: SIZING.spacing.lg,
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
  memberInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberActionButton: {
    paddingVertical: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    marginLeft: SIZING.spacing.sm,
  },
  memberActionButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
  },
  youLabel: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  crewInfoScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  crewInfoSection: {
    padding: SIZING.spacing.md,
  },
  infoItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.md,
  },
  infoLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
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
  errorText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    fontWeight: '600',
    padding: SIZING.spacing.lg,
  },
  rankingScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  rankingSection: {
    padding: SIZING.spacing.md,
  },
  rankingSubsection: {
    marginBottom: SIZING.spacing.lg,
  },
  rankingList: {
    marginTop: SIZING.spacing.sm,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: SIZING.spacing.md,
    marginBottom: SIZING.spacing.sm,
  },
  rankingRank: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginRight: SIZING.spacing.sm,
    minWidth: 40,
  },
  rankingHandle: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    flex: 1,
  },
  rankingLevel: {
    fontSize: SIZING.font.small,
    fontWeight: '500',
    marginLeft: SIZING.spacing.sm,
  },
  crewRulesScrollContent: {
    paddingBottom: SIZING.spacing.lg,
  },
  crewRulesEditContainer: {
    alignItems: 'flex-end',
    marginBottom: SIZING.spacing.md,
  },
  crewRulesEditButton: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  crewRulesEditButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  crewRulesContent: {
    flex: 1,
  },
  crewRulesEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crewRulesEmptyText: {
    fontSize: SIZING.font.body,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  leaveCrewButtonContainer: {
    marginBottom: SIZING.spacing.lg,
    alignItems: 'center',
  },
  leaveCrewButton: {
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  leaveCrewButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
});

