import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import {
  useGetAllianceStatusQuery,
  useGetAllianceManagementCrewsQuery,
  useRequestAllianceMutation,
  useAcceptAllianceMutation,
  useTerminateAllianceMutation,
} from '../../store/api/authApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AllianceManagementModalProps {
  visible: boolean;
  onClose: () => void;
  crewId?: string;
}

export const AllianceManagementModal: React.FC<AllianceManagementModalProps> = ({
  visible,
  onClose,
  crewId,
}) => {
  const colors = useThemeColors();
  const [error, setError] = useState('');
  const [processingCrewId, setProcessingCrewId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'request' | 'accept' | 'terminate' | null>(null);

  const { data: allianceStatusData, isLoading: isLoadingAllianceStatus, isFetching: isFetchingAllianceStatus, error: allianceStatusError, refetch: refetchAllianceStatus } = useGetAllianceStatusQuery(undefined, {
    skip: !visible,
    pollingInterval: visible ? 3000 : 0,
  });

  const { data: crewsData, isLoading: isLoadingCrews, error: crewsError, refetch: refetchCrews } = useGetAllianceManagementCrewsQuery(undefined, {
    skip: !visible,
    pollingInterval: visible ? 3000 : 0,
  });

  const [requestAlliance, { isLoading: isRequestingAlliance }] = useRequestAllianceMutation();
  const [acceptAlliance, { isLoading: isAcceptingAlliance }] = useAcceptAllianceMutation();
  const [terminateAlliance, { isLoading: isTerminatingAlliance }] = useTerminateAllianceMutation();

  const alliances = allianceStatusData?.alliances || [];
  const requestsWeSent = allianceStatusData?.requestsWeSent || [];
  const requestsWeReceived = allianceStatusData?.requestsWeReceived || [];
  const availableCrews = crewsData?.crews || [];
  
  // Maximum of 2 alliances allowed
  const hasReachedAllianceLimit = alliances.length >= 2;

  useEffect(() => {
    if (visible) {
      setError('');
      setProcessingCrewId(null);
      setProcessingAction(null);
    }
  }, [visible]);

  const handleRequestAlliance = async (targetCrewId: string) => {
    if (isRequestingAlliance || isAcceptingAlliance || isTerminatingAlliance || processingCrewId) return;

    setError('');
    setProcessingCrewId(targetCrewId);
    setProcessingAction('request');
    try {
      await requestAlliance({ targetCrewId }).unwrap();
      try {
        await refetchAllianceStatus();
      } catch (refetchError) {
        console.warn('Failed to refetch alliance status after requesting alliance:', refetchError);
      }
      try {
        await refetchCrews();
      } catch (refetchError) {
        console.warn('Failed to refetch crews after requesting alliance:', refetchError);
      }
      setProcessingCrewId(null);
      setProcessingAction(null);
    } catch (error: any) {
      setError(error?.data?.error || error?.message || 'Failed to request alliance. Please try again.');
      setProcessingCrewId(null);
      setProcessingAction(null);
    }
  };

  const handleAcceptAlliance = async (targetCrewId: string) => {
    if (isRequestingAlliance || isAcceptingAlliance || isTerminatingAlliance || processingCrewId) return;

    setError('');
    setProcessingCrewId(targetCrewId);
    setProcessingAction('accept');
    try {
      await acceptAlliance({ targetCrewId }).unwrap();
      try {
        await refetchAllianceStatus();
      } catch (refetchError) {
        console.warn('Failed to refetch alliance status after accepting alliance:', refetchError);
      }
      try {
        await refetchCrews();
      } catch (refetchError) {
        console.warn('Failed to refetch crews after accepting alliance:', refetchError);
      }
      setProcessingCrewId(null);
      setProcessingAction(null);
    } catch (error: any) {
      setError(error?.data?.error || error?.message || 'Failed to accept alliance. Please try again.');
      setProcessingCrewId(null);
      setProcessingAction(null);
    }
  };

  const handleTerminateAlliance = async (targetCrewId: string) => {
    if (isRequestingAlliance || isAcceptingAlliance || isTerminatingAlliance || processingCrewId) return;

    setError('');
    setProcessingCrewId(targetCrewId);
    setProcessingAction('terminate');
    try {
      await terminateAlliance({ targetCrewId }).unwrap();
      try {
        await refetchAllianceStatus();
      } catch (refetchError) {
        console.warn('Failed to refetch alliance status after terminating alliance:', refetchError);
      }
      try {
        await refetchCrews();
      } catch (refetchError) {
        console.warn('Failed to refetch crews after terminating alliance:', refetchError);
      }
      setProcessingCrewId(null);
      setProcessingAction(null);
    } catch (error: any) {
      setError(error?.data?.error || error?.message || 'Failed to terminate alliance. Please try again.');
      setProcessingCrewId(null);
      setProcessingAction(null);
    }
  };

  const handleClose = () => {
    setError('');
    setProcessingCrewId(null);
    setProcessingAction(null);
    onClose();
  };

  const styles = createStyles(colors);

  if (!visible) {
    return null;
  }

  const isProcessing = isRequestingAlliance || isAcceptingAlliance || isTerminatingAlliance;
  const yellowColor = '#FFD700';
  const darkYellowColor = '#DAA520';

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
        <SafeAreaView style={styles.allianceManagementModalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>ALLIANCE MANAGEMENT</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {(error || allianceStatusError || crewsError) ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error || (allianceStatusError as any)?.data?.error || (crewsError as any)?.data?.error || 'An error occurred. Please try again.'}
                </Text>
              </View>
            ) : null}

            {isLoadingAllianceStatus ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading alliance status...</Text>
              </View>
            ) : (
              <>
                <View style={styles.allianceStatusSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>CURRENT ALLIANCES</Text>
                  
                  {alliances.length > 0 ? (
                    <View style={styles.alliancesList}>
                      {alliances.map((alliance) => (
                        <View key={alliance.alliedCrewId} style={[styles.allianceCard, { backgroundColor: yellowColor + '20', borderColor: yellowColor }]}>
                          <Text style={[styles.allianceLabel, { color: colors.text.secondary }]}>Allied With:</Text>
                          <Text style={[styles.allianceValue, { color: colors.text.primary }]}>
                            {alliance.alliedCrewName} ({alliance.alliedCrewIdentifier})
                          </Text>
                          <TouchableOpacity
                            style={[styles.terminateAllianceButton, { backgroundColor: colors.error, borderColor: colors.error }]}
                            onPress={() => handleTerminateAlliance(alliance.alliedCrewId)}
                            disabled={isProcessing || (processingCrewId === alliance.alliedCrewId && processingAction === 'terminate')}
                            activeOpacity={0.7}
                          >
                            {processingCrewId === alliance.alliedCrewId && processingAction === 'terminate' ? (
                              <ActivityIndicator size="small" color={colors.background} />
                            ) : (
                              <Text style={[styles.terminateAllianceButtonText, { color: colors.background }]}>
                                TERMINATE ALLIANCE
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.allianceCard, { backgroundColor: colors.surface, borderColor: colors.secondary }]}>
                      <Text style={[styles.noAllianceText, { color: colors.text.secondary }]}>
                        No active alliances
                      </Text>
                    </View>
                  )}
                </View>

                {(requestsWeSent.length > 0 || requestsWeReceived.length > 0) && (
                  <View style={styles.pendingProposalsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>PENDING ALLIANCE PROPOSALS</Text>
                    
                    {requestsWeReceived.length > 0 && (
                      <View style={styles.proposalsSubsection}>
                        <Text style={[styles.proposalsSubsectionTitle, { color: colors.text.primary }]}>Requests We Received</Text>
                        {requestsWeReceived.map((request) => (
                          <View key={request.requestingCrewId} style={[styles.proposalCard, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                            <Text style={[styles.proposalLabel, { color: colors.text.secondary }]}>Request From:</Text>
                            <Text style={[styles.proposalValue, { color: colors.text.primary }]}>
                              {request.requestingCrewName} ({request.requestingCrewIdentifier})
                            </Text>
                            <TouchableOpacity
                              style={[styles.acceptAllianceButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                              onPress={() => handleAcceptAlliance(request.requestingCrewId)}
                              disabled={isProcessing || (processingCrewId === request.requestingCrewId && processingAction === 'accept') || hasReachedAllianceLimit}
                              activeOpacity={0.7}
                            >
                              {processingCrewId === request.requestingCrewId && processingAction === 'accept' ? (
                                <ActivityIndicator size="small" color={colors.background} />
                              ) : (
                                <Text style={[styles.acceptAllianceButtonText, { color: colors.background }]}>
                                  ACCEPT ALLIANCE
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {requestsWeSent.length > 0 && (
                      <View style={styles.proposalsSubsection}>
                        <Text style={[styles.proposalsSubsectionTitle, { color: colors.text.primary }]}>Requests We Sent</Text>
                        {requestsWeSent.map((request) => (
                          <View key={request.requestedCrewId} style={[styles.proposalCard, { backgroundColor: colors.surface, borderColor: colors.secondary }]}>
                            <Text style={[styles.proposalLabel, { color: colors.text.secondary }]}>Request To:</Text>
                            <Text style={[styles.proposalValue, { color: colors.text.primary }]}>
                              {request.requestedCrewName} ({request.requestedCrewIdentifier})
                            </Text>
                            <Text style={[styles.pendingStatusText, { color: colors.text.secondary }]}>
                              Pending...
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.availableCrewsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>AVAILABLE CREWS</Text>
                  {hasReachedAllianceLimit && (
                    <View style={[styles.infoContainer, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
                      <Text style={[styles.infoText, { color: colors.warning }]}>
                        You have reached the maximum limit of 2 alliances. Please terminate an existing alliance before requesting a new one.
                      </Text>
                    </View>
                  )}
                  {isLoadingCrews ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading crews...</Text>
                    </View>
                  ) : availableCrews.length === 0 ? (
                    <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.secondary }]}>
                      <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                        No other crews available
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.crewsList}>
                      {availableCrews
                        .filter(crew => crew.status === 'available')
                        .map((crew) => {
                          const isRequesting = processingCrewId === crew.id && processingAction === 'request';
                          const isDisabled = isProcessing || isRequesting || !!allianceStatusError || hasReachedAllianceLimit;
                          return (
                            <View
                              key={crew.id}
                              style={[
                                styles.crewItem,
                                {
                                  backgroundColor: isDisabled ? colors.surface + '80' : colors.surface,
                                  borderColor: isDisabled ? colors.secondary + '80' : colors.secondary,
                                }
                              ]}
                            >
                              <View style={styles.crewInfoContainer}>
                                <Text style={[styles.crewName, { color: colors.text.primary }]}>
                                  {crew.crewName}
                                </Text>
                                <Text style={[styles.crewIdentifier, { color: colors.text.secondary }]}>
                                  {crew.crewIdentifier}
                                </Text>
                                <Text style={[styles.crewMemberCount, { color: colors.text.secondary }]}>
                                  {crew.memberCount} {crew.memberCount === 1 ? 'member' : 'members'}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[
                                  styles.requestAllianceButton,
                                  {
                                    backgroundColor: isDisabled ? colors.buttonDisabled : yellowColor,
                                    borderColor: isDisabled ? colors.buttonDisabled : darkYellowColor,
                                  }
                                ]}
                                onPress={() => handleRequestAlliance(crew.id)}
                                disabled={isDisabled}
                                activeOpacity={0.7}
                              >
                                {isRequesting ? (
                                  <ActivityIndicator size="small" color={colors.background} />
                                ) : (
                                  <Text style={[styles.requestAllianceButtonText, { color: colors.background }]}>
                                    REQUEST ALLIANCE
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>
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
  allianceManagementModalContainer: {
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
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    color: colors.text.primary,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZING.spacing.lg,
    paddingBottom: SIZING.spacing.xl,
  },
  errorContainer: {
    padding: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SIZING.spacing.md,
  },
  errorText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoContainer: {
    padding: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SIZING.spacing.md,
  },
  infoText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: SIZING.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SIZING.spacing.md,
    fontSize: SIZING.font.body,
  },
  allianceStatusSection: {
    marginBottom: SIZING.spacing.xl,
  },
  sectionTitle: {
    fontSize: SIZING.font.h3,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  alliancesList: {
    gap: SIZING.spacing.md,
  },
  allianceCard: {
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
  },
  allianceLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  allianceValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.md,
  },
  noAllianceText: {
    fontSize: SIZING.font.body,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: SIZING.spacing.md,
  },
  terminateAllianceButton: {
    marginTop: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  terminateAllianceButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  pendingProposalsSection: {
    marginBottom: SIZING.spacing.xl,
  },
  proposalsSubsection: {
    marginBottom: SIZING.spacing.lg,
  },
  proposalsSubsectionTitle: {
    fontSize: SIZING.font.h4,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    marginTop: SIZING.spacing.md,
  },
  proposalCard: {
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: SIZING.spacing.md,
  },
  proposalLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  proposalValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.md,
  },
  pendingStatusText: {
    fontSize: SIZING.font.small,
    fontStyle: 'italic',
  },
  acceptAllianceButton: {
    marginTop: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  acceptAllianceButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
  },
  availableCrewsSection: {
    marginTop: SIZING.spacing.lg,
  },
  emptyContainer: {
    padding: SIZING.spacing.xl,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: SIZING.font.body,
    fontStyle: 'italic',
  },
  crewsList: {
    gap: SIZING.spacing.md,
  },
  crewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  crewInfoContainer: {
    flex: 1,
  },
  crewName: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs,
  },
  crewIdentifier: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
  },
  crewMemberCount: {
    fontSize: SIZING.font.small,
  },
  requestAllianceButton: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    minHeight: 40,
  },
  requestAllianceButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
});

