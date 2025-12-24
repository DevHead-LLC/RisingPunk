import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { 
  useGetIndividualBotsDestroyedLeaderboardQuery, 
  useGetIndividualNetWorthLeaderboardQuery,
  useGetCrewBotsDestroyedLeaderboardQuery,
  useGetCrewNetWorthLeaderboardQuery,
} from '../../store/api/leaderboardApi';

interface LeaderboardModalProps {
  visible: boolean;
  onClose: () => void;
}

type MainTab = 'crew' | 'individual';
type MetricTab = 'botsDestroyed' | 'netWorth';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const [mainTab, setMainTab] = useState<MainTab>('individual');
  const [metricTab, setMetricTab] = useState<MetricTab>('botsDestroyed');
  const [appState, setAppState] = useState(AppState.currentState);
  const [delayedVisible, setDelayedVisible] = useState(false);
  const isMountedRef = useRef(true);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (!isMountedRef.current) return;
      setAppState(nextAppState);
      if (nextAppState !== 'active' && visible) {
        onClose();
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.remove();
    };
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      delayTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setDelayedVisible(true);
        }
      }, 100);
    } else {
      setDelayedVisible(false);
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [visible]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, []);

  if (!colors) {
    return null;
  }

  const styles = createStyles(colors);
  
  const isAppActive = appState === 'active';

  const shouldSkipQueries = !delayedVisible || !isAppActive;

  const { data: botsDestroyedData, isLoading: isLoadingBotsDestroyed, error: botsDestroyedError } = useGetIndividualBotsDestroyedLeaderboardQuery(undefined, {
    skip: shouldSkipQueries || mainTab !== 'individual' || metricTab !== 'botsDestroyed',
    pollingInterval: delayedVisible && isAppActive && mainTab === 'individual' && metricTab === 'botsDestroyed' ? 900000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const { data: netWorthData, isLoading: isLoadingNetWorth, error: netWorthError } = useGetIndividualNetWorthLeaderboardQuery(undefined, {
    skip: shouldSkipQueries || mainTab !== 'individual' || metricTab !== 'netWorth',
    pollingInterval: delayedVisible && isAppActive && mainTab === 'individual' && metricTab === 'netWorth' ? 900000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const { data: crewBotsDestroyedData, isLoading: isLoadingCrewBotsDestroyed, error: crewBotsDestroyedError } = useGetCrewBotsDestroyedLeaderboardQuery(undefined, {
    skip: shouldSkipQueries || mainTab !== 'crew' || metricTab !== 'botsDestroyed',
    pollingInterval: delayedVisible && isAppActive && mainTab === 'crew' && metricTab === 'botsDestroyed' ? 900000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const { data: crewNetWorthData, isLoading: isLoadingCrewNetWorth, error: crewNetWorthError } = useGetCrewNetWorthLeaderboardQuery(undefined, {
    skip: shouldSkipQueries || mainTab !== 'crew' || metricTab !== 'netWorth',
    pollingInterval: delayedVisible && isAppActive && mainTab === 'crew' && metricTab === 'netWorth' ? 900000 : 0,
    refetchOnMountOrArgChange: true,
  });

  const formatLastUpdated = (dateString: string | undefined | null): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderBotsDestroyedContent = () => {
    if (isLoadingBotsDestroyed) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      );
    }

    if (botsDestroyedError || (botsDestroyedData && 'message' in botsDestroyedData)) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading leaderboard</Text>
        </View>
      );
    }

    if (!botsDestroyedData || !botsDestroyedData.users || botsDestroyedData.users.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leaderboard data available yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.leaderboardContainer}>
        {botsDestroyedData.users.map((user, index) => (
          <View key={user.rank != null ? user.rank : `user-${index}`} style={styles.leaderboardRow}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankText}>{user.rank != null ? user.rank : index + 1}</Text>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.handleText}>{user.handle || ''}</Text>
              <Text style={styles.levelText}>Level {user.level || 0}</Text>
            </View>
            <View style={styles.statContainer}>
              <Text style={styles.statValue}>{(user.botsDestroyed != null ? user.botsDestroyed.toLocaleString() : '0')}</Text>
              <Text style={styles.statLabel}>Bots Destroyed</Text>
            </View>
          </View>
        ))}
        {botsDestroyedData.lastUpdated && (
          <View style={styles.footerContainer}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {formatLastUpdated(botsDestroyedData.lastUpdated)}
            </Text>
            <Text style={styles.updateNoteText}>*Leaderboard updates every 15 minutes</Text>
          </View>
        )}
      </View>
    );
  };

  const renderNetWorthContent = () => {
    if (isLoadingNetWorth) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      );
    }

    if (netWorthError || (netWorthData && 'message' in netWorthData)) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading leaderboard</Text>
        </View>
      );
    }

    if (!netWorthData || !netWorthData.users || netWorthData.users.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leaderboard data available yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.leaderboardContainer}>
        {netWorthData.users.map((user, index) => (
          <View key={user.rank != null ? user.rank : `user-${index}`} style={styles.leaderboardRow}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankText}>{user.rank != null ? user.rank : index + 1}</Text>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.handleText}>{user.handle || ''}</Text>
              <Text style={styles.levelText}>Level {user.level || 0}</Text>
            </View>
            <View style={styles.statContainer}>
              <Text style={styles.statValue}>${(user.netWorth != null ? user.netWorth.toLocaleString() : '0')}</Text>
              <Text style={styles.statLabel}>Net Worth</Text>
            </View>
          </View>
        ))}
        {netWorthData.lastUpdated && (
          <View style={styles.footerContainer}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {formatLastUpdated(netWorthData.lastUpdated)}
            </Text>
            <Text style={styles.updateNoteText}>*Leaderboard updates every 15 minutes</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCrewBotsDestroyedContent = () => {
    if (isLoadingCrewBotsDestroyed) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      );
    }

    if (crewBotsDestroyedError || (crewBotsDestroyedData && 'message' in crewBotsDestroyedData)) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading leaderboard</Text>
        </View>
      );
    }

    if (!crewBotsDestroyedData || !crewBotsDestroyedData.crews || crewBotsDestroyedData.crews.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leaderboard data available yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.leaderboardContainer}>
        {crewBotsDestroyedData.crews.map((crew, index) => (
          <View key={crew.rank != null ? crew.rank : `crew-${index}`} style={styles.leaderboardRow}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankText}>{crew.rank != null ? crew.rank : index + 1}</Text>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.handleText}>{crew.crewName || ''}</Text>
              <Text style={styles.levelText}>{crew.crewIdentifier || 'N/A'} • {crew.memberCount != null ? crew.memberCount : 0} members</Text>
            </View>
            <View style={styles.statContainer}>
              <Text style={styles.statValue}>{(crew.botsDestroyed != null ? crew.botsDestroyed.toLocaleString() : '0')}</Text>
              <Text style={styles.statLabel}>Bots Destroyed</Text>
            </View>
          </View>
        ))}
        {crewBotsDestroyedData.lastUpdated && (
          <View style={styles.footerContainer}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {formatLastUpdated(crewBotsDestroyedData.lastUpdated)}
            </Text>
            <Text style={styles.updateNoteText}>*Leaderboard updates every 15 minutes</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCrewNetWorthContent = () => {
    if (isLoadingCrewNetWorth) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      );
    }

    if (crewNetWorthError || (crewNetWorthData && 'message' in crewNetWorthData)) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading leaderboard</Text>
        </View>
      );
    }

    if (!crewNetWorthData || !crewNetWorthData.crews || crewNetWorthData.crews.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leaderboard data available yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.leaderboardContainer}>
        {crewNetWorthData.crews.map((crew, index) => (
          <View key={crew.rank != null ? crew.rank : `crew-${index}`} style={styles.leaderboardRow}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankText}>{crew.rank != null ? crew.rank : index + 1}</Text>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.handleText}>{crew.crewName || ''}</Text>
              <Text style={styles.levelText}>{crew.crewIdentifier || 'N/A'} • {crew.memberCount != null ? crew.memberCount : 0} members</Text>
            </View>
            <View style={styles.statContainer}>
              <Text style={styles.statValue}>${(crew.netWorth != null ? crew.netWorth.toLocaleString() : '0')}</Text>
              <Text style={styles.statLabel}>Net Worth</Text>
            </View>
          </View>
        ))}
        {crewNetWorthData.lastUpdated && (
          <View style={styles.footerContainer}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {formatLastUpdated(crewNetWorthData.lastUpdated)}
            </Text>
            <Text style={styles.updateNoteText}>*Leaderboard updates every 15 minutes</Text>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (mainTab === 'individual' && metricTab === 'botsDestroyed') {
      return renderBotsDestroyedContent();
    }

    if (mainTab === 'individual' && metricTab === 'netWorth') {
      return renderNetWorthContent();
    }

    if (mainTab === 'crew' && metricTab === 'botsDestroyed') {
      return renderCrewBotsDestroyedContent();
    }

    if (mainTab === 'crew' && metricTab === 'netWorth') {
      return renderCrewNetWorthContent();
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No content available</Text>
      </View>
    );
  };

  const handleDismiss = () => {
    if (isMountedRef.current) {
      onClose();
    }
  };

  return (
    <Modal
      visible={delayedVisible && isAppActive && isMountedRef.current}
      animationType="fade"
      transparent={true}
      onRequestClose={handleDismiss}
      onDismiss={handleDismiss}
      statusBarTranslucent={true}
      supportedOrientations={['landscape']}
      hardwareAccelerated={true}
      presentationStyle="overFullScreen"
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Leaderboards</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mainTabsContainer}>
            <TouchableOpacity
              style={[
                styles.mainTab,
                mainTab === 'individual' && styles.mainTabActive,
              ]}
              onPress={() => setMainTab('individual')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.mainTabText,
                  mainTab === 'individual' && styles.mainTabTextActive,
                ]}
              >
                Individual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mainTab,
                mainTab === 'crew' && styles.mainTabActive,
              ]}
              onPress={() => setMainTab('crew')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.mainTabText,
                  mainTab === 'crew' && styles.mainTabTextActive,
                ]}
              >
                Crew
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bodyContainer}>
            <View style={styles.secondaryTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.secondaryTab,
                  metricTab === 'botsDestroyed' && styles.secondaryTabActive,
                ]}
                onPress={() => setMetricTab('botsDestroyed')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.secondaryTabText,
                    metricTab === 'botsDestroyed' && styles.secondaryTabTextActive,
                  ]}
                >
                  Bots Destroyed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryTab,
                  metricTab === 'netWorth' && styles.secondaryTabActive,
                ]}
                onPress={() => setMetricTab('netWorth')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.secondaryTabText,
                    metricTab === 'netWorth' && styles.secondaryTabTextActive,
                  ]}
                >
                  Net Worth
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.contentScrollView} 
              showsVerticalScrollIndicator={false}
            >
              {renderContent()}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: colors.background,
    },
    modalContainer: {
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
    mainTabsContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.secondary,
      paddingHorizontal: SIZING.spacing.md,
    },
    mainTab: {
      flex: 1,
      paddingVertical: SIZING.spacing.md,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    mainTabActive: {
      borderBottomColor: colors.primary,
    },
    mainTabText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.body,
      fontWeight: '600',
    },
    mainTabTextActive: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    bodyContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    secondaryTabsContainer: {
      width: 120,
      borderRightWidth: 1,
      borderRightColor: colors.secondary,
      paddingTop: SIZING.spacing.md,
    },
    secondaryTab: {
      paddingVertical: SIZING.spacing.md,
      paddingHorizontal: SIZING.spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: 'transparent',
    },
    secondaryTabActive: {
      borderLeftColor: colors.primary,
      backgroundColor: colors.surface,
    },
    secondaryTabText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      fontWeight: '500',
    },
    secondaryTabTextActive: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    contentScrollView: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      padding: SIZING.spacing.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      color: colors.text.primary,
      fontSize: SIZING.font.h3,
      fontWeight: 'bold',
      marginBottom: SIZING.spacing.md,
      textAlign: 'center',
    },
    placeholderSubtext: {
      color: colors.text.secondary,
      fontSize: SIZING.font.body,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SIZING.spacing.lg,
    },
    loadingText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.body,
      marginTop: SIZING.spacing.md,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SIZING.spacing.lg,
    },
    errorText: {
      color: colors.error,
      fontSize: SIZING.font.body,
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SIZING.spacing.lg,
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.body,
      textAlign: 'center',
    },
    leaderboardContainer: {
      flex: 1,
      padding: SIZING.spacing.md,
    },
    leaderboardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SIZING.spacing.md,
      paddingHorizontal: SIZING.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.secondary + '33',
      gap: SIZING.spacing.md,
    },
    rankContainer: {
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      color: colors.primary,
      fontSize: SIZING.font.h3,
      fontWeight: 'bold',
    },
    userInfoContainer: {
      flex: 1,
    },
    handleText: {
      color: colors.text.primary,
      fontSize: SIZING.font.body,
      fontWeight: '600',
      marginBottom: SIZING.spacing.xs / 2,
    },
    levelText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
    },
    statContainer: {
      alignItems: 'flex-end',
    },
    statValue: {
      color: colors.matrix,
      fontSize: SIZING.font.body,
      fontWeight: 'bold',
      marginBottom: SIZING.spacing.xs / 2,
    },
    statLabel: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
    },
    footerContainer: {
      padding: SIZING.spacing.md,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.secondary + '33',
      marginTop: SIZING.spacing.md,
    },
    lastUpdatedText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      marginBottom: SIZING.spacing.xs,
    },
    updateNoteText: {
      color: colors.text.secondary,
      fontSize: SIZING.font.small,
      fontStyle: 'italic',
    },
  });

