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
  useGetWarStatusQuery,
  useGetWarManagementCrewsQuery,
  useDeclareWarMutation,
  useTerminateWarMutation,
} from '../../store/api/authApi';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WarManagementModalProps {
  visible: boolean;
  onClose: () => void;
  crewId?: string;
}

export const WarManagementModal: React.FC<WarManagementModalProps> = ({
  visible,
  onClose,
  crewId,
}) => {
  const colors = useThemeColors();
  const [error, setError] = useState('');
  const [declaringWarCrewId, setDeclaringWarCrewId] = useState<string | null>(null);

  const { data: warStatusData, isLoading: isLoadingWarStatus, isFetching: isFetchingWarStatus, error: warStatusError, refetch: refetchWarStatus } = useGetWarStatusQuery(undefined, {
    skip: !visible,
    pollingInterval: visible ? 3000 : 0,
  });

  const { data: crewsData, isLoading: isLoadingCrews, error: crewsError, refetch: refetchCrews } = useGetWarManagementCrewsQuery(undefined, {
    skip: !visible,
    pollingInterval: visible ? 3000 : 0,
  });

  const [declareWar, { isLoading: isDeclaringWar }] = useDeclareWarMutation();
  const [terminateWar, { isLoading: isTerminatingWar }] = useTerminateWarMutation();

  const warsWeDeclared = warStatusData?.warsWeDeclared || [];
  const warsDeclaredOnUs = warStatusData?.warsDeclaredOnUs || [];
  const isAtWar = warStatusData?.isAtWar || false;
  const hasDeclaredWar = warsWeDeclared.length > 0; // Only check if we've declared war, not if war is declared on us
  const availableCrews = crewsData?.crews || [];

  useEffect(() => {
    if (visible) {
      setError('');
      setDeclaringWarCrewId(null);
    }
  }, [visible]);

  const handleDeclareWar = async (targetCrewId: string) => {
    if (isDeclaringWar || isTerminatingWar || declaringWarCrewId) return;

    setError('');
    setDeclaringWarCrewId(targetCrewId);
    try {
      await declareWar({ targetCrewId }).unwrap();
      try {
        await refetchWarStatus();
      } catch (refetchError) {
        console.warn('Failed to refetch war status after declaring war:', refetchError);
      }
      try {
        await refetchCrews();
      } catch (refetchError) {
        console.warn('Failed to refetch crews after declaring war:', refetchError);
      }
      setDeclaringWarCrewId(null);
    } catch (error: any) {
      setError(error?.data?.error || error?.message || 'Failed to declare war. Please try again.');
      setDeclaringWarCrewId(null);
    }
  };

  const handleTerminateWar = async () => {
    if (isDeclaringWar || isTerminatingWar) return;

    setError('');
    try {
      await terminateWar().unwrap();
      try {
        await refetchWarStatus();
      } catch (refetchError) {
        console.warn('Failed to refetch war status after terminating war:', refetchError);
      }
      try {
        await refetchCrews();
      } catch (refetchError) {
        console.warn('Failed to refetch crews after terminating war:', refetchError);
      }
    } catch (error: any) {
      setError(error?.data?.error || error?.message || 'Failed to terminate war. Please try again.');
    }
  };

  const handleClose = () => {
    setError('');
    setDeclaringWarCrewId(null);
    onClose();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  const styles = createStyles(colors);

  if (!visible) {
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
        <SafeAreaView style={styles.warManagementModalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>WAR MANAGEMENT</Text>
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
            {(error || warStatusError || crewsError) ? (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error || (warStatusError as any)?.data?.error || (crewsError as any)?.data?.error || 'An error occurred. Please try again.'}
                </Text>
              </View>
            ) : null}

            {isLoadingWarStatus ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading war status...</Text>
              </View>
            ) : (
              <>
                <View style={styles.warStatusSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>CURRENT WAR STATUS</Text>
                  
                  {warsWeDeclared.length > 0 && (
                    <View style={styles.warSubsection}>
                      <Text style={[styles.warSubsectionTitle, { color: colors.text.primary }]}>Wars We Declared</Text>
                      {warsWeDeclared.map((war) => (
                        <View key={war.enemyCrewId} style={[styles.warStatusCard, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                          <Text style={[styles.warStatusLabel, { color: colors.text.secondary }]}>At War With:</Text>
                          <Text style={[styles.warStatusValue, { color: colors.text.primary }]}>
                            {war.enemyCrewName} ({war.enemyCrewIdentifier})
                          </Text>
                          <Text style={[styles.warStatusLabel, { color: colors.text.secondary }]}>War Declared:</Text>
                          <Text style={[styles.warStatusValue, { color: colors.text.primary }]}>
                            {formatDate(war.warDeclaredAt)}
                          </Text>
                          <TouchableOpacity
                            style={[styles.terminateWarButton, { backgroundColor: colors.error, borderColor: colors.error }]}
                            onPress={handleTerminateWar}
                            disabled={isTerminatingWar || isDeclaringWar}
                            activeOpacity={0.7}
                          >
                            {isTerminatingWar ? (
                              <ActivityIndicator size="small" color={colors.background} />
                            ) : (
                              <Text style={[styles.terminateWarButtonText, { color: colors.background }]}>
                                TERMINATE WAR
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {warsDeclaredOnUs.length > 0 && (
                    <View style={styles.warSubsection}>
                      <Text style={[styles.warSubsectionTitle, { color: colors.text.primary }]}>Wars Declared On Us</Text>
                      {warsDeclaredOnUs.map((war) => (
                        <View key={war.enemyCrewId} style={[styles.warStatusCard, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                          <Text style={[styles.warStatusLabel, { color: colors.text.secondary }]}>War Declared By:</Text>
                          <Text style={[styles.warStatusValue, { color: colors.text.primary }]}>
                            {war.enemyCrewName} ({war.enemyCrewIdentifier})
                          </Text>
                          <Text style={[styles.warStatusLabel, { color: colors.text.secondary }]}>War Declared:</Text>
                          <Text style={[styles.warStatusValue, { color: colors.text.primary }]}>
                            {formatDate(war.warDeclaredAt)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {!isAtWar && (
                    <View style={[styles.warStatusCard, { backgroundColor: colors.surface, borderColor: colors.secondary }]}>
                      <Text style={[styles.noWarText, { color: colors.text.secondary }]}>
                        Not currently at war
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.availableCrewsSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>AVAILABLE CREWS</Text>
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
                      {availableCrews.map((crew) => {
                        const isDeclaring = declaringWarCrewId === crew.id;
                        // Only disable if we've declared war (not if war is declared on us)
                        // Also disable if war status has an error (unknown state)
                        // Note: We don't disable during isFetchingWarStatus as that's just background polling
                        const isDisabled = hasDeclaredWar || isDeclaringWar || isTerminatingWar || isDeclaring || !!warStatusError;
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
                                styles.declareWarButton,
                                {
                                  backgroundColor: isDisabled ? colors.buttonDisabled : colors.error,
                                  borderColor: isDisabled ? colors.buttonDisabled : colors.error,
                                }
                              ]}
                              onPress={() => handleDeclareWar(crew.id)}
                              disabled={isDisabled}
                              activeOpacity={0.7}
                            >
                              {isDeclaring ? (
                                <ActivityIndicator size="small" color={colors.background} />
                              ) : (
                                <Text style={[styles.declareWarButtonText, { color: colors.background }]}>
                                  DECLARE WAR
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
  warManagementModalContainer: {
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
  loadingContainer: {
    padding: SIZING.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SIZING.spacing.md,
    fontSize: SIZING.font.body,
  },
  warStatusSection: {
    marginBottom: SIZING.spacing.xl,
  },
  sectionTitle: {
    fontSize: SIZING.font.h3,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.md,
  },
  warSubsection: {
    marginBottom: SIZING.spacing.lg,
  },
  warSubsectionTitle: {
    fontSize: SIZING.font.h4,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    marginTop: SIZING.spacing.md,
  },
  warStatusCard: {
    padding: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 2,
  },
  warStatusLabel: {
    fontSize: SIZING.font.small,
    fontWeight: '600',
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.xs,
  },
  warStatusValue: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  noWarText: {
    fontSize: SIZING.font.body,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: SIZING.spacing.md,
  },
  terminateWarButton: {
    marginTop: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.md,
    paddingHorizontal: SIZING.spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  terminateWarButtonText: {
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
  declareWarButton: {
    paddingVertical: SIZING.spacing.sm,
    paddingHorizontal: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 40,
  },
  declareWarButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
});

