import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useGetCurrentTaskGuideTaskQuery, useCompleteTaskGuideTaskMutation } from '../../store/api/userGuideApi';
import { useTaskGuideHighlight } from '../../contexts/TaskGuideHighlightContext';
import { useAppSelector } from '../../store/hooks';
import { getCurrentBalance } from '../../store/slices/balanceSlice';
import { LockedFeatureModal } from '../turf/LockedFeatureModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TaskGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToProfile?: () => void;
}

export const TaskGuideModal: React.FC<TaskGuideModalProps> = ({
  visible,
  onClose,
  onNavigateToProfile,
}) => {
  const colors = useThemeColors();
  const { data, isLoading, error } = useGetCurrentTaskGuideTaskQuery(undefined, {
    skip: false, // Always fetch, don't skip
  });
  const [completeTask] = useCompleteTaskGuideTaskMutation();
  const { setHighlightTaskId } = useTaskGuideHighlight();
  const currentBalance = useAppSelector(getCurrentBalance);
  const buildingProgress = useAppSelector((state) => state.bots.buildingProgress);
  const buildQueue = useAppSelector((state) => state.bots.buildQueue);
  // Check if there's an active build in progress (not completed)
  // buildingProgress is null when no build, or 0-100 when building (100 = complete)
  // buildQueue exists when there's an active build queue
  // Only block if there's an active, incomplete build
  // Note: buildQueue.progress may be undefined if build was just created and hasn't been polled yet
  // So we check completesAt date instead - if it's in the future, build is active
  const hasActiveBuildProgress = buildingProgress !== null && typeof buildingProgress === 'number' && buildingProgress < 100;
  const hasActiveBuildQueue = buildQueue !== null && 
                              buildQueue.completesAt &&
                              new Date(buildQueue.completesAt) > new Date() &&
                              (buildQueue.progress === undefined || buildQueue.progress < 100);
  const isBuildInProgress = hasActiveBuildProgress || hasActiveBuildQueue;
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [showBuildInProgressModal, setShowBuildInProgressModal] = useState(false);
  const [showLockedFeatureModal, setShowLockedFeatureModal] = useState(false);
  const [blockedTaskId, setBlockedTaskId] = useState<string | null>(null);

  const taskList = data?.taskList || [];
  const completedTaskIds = new Set(data?.completedTaskIds || []);
  const collectedTaskIds = new Set(data?.collectedTaskIds || []);

  // Check if task is completed (action done) but not yet collected (reward not given)
  // A task shows "Collect" button if it's completed but not collected
  const isTaskCompleted = (taskId: string) => {
    // create-account is always considered completed (user is logged in)
    // but it can still be collected if not in collectedTaskIds
    if (taskId === 'create-account') return !collectedTaskIds.has(taskId);
    // Task is completed if it's in completedTaskIds but not yet in collectedTaskIds
    return completedTaskIds.has(taskId) && !collectedTaskIds.has(taskId);
  };

  const handleTaskAction = async (taskId: string) => {
    if (isTaskCompleted(taskId)) {
      // Collect reward - mark task as complete and add reward to balance
      try {
        await completeTask({ taskId }).unwrap();
        // RTK Query will automatically refetch and update the list
      } catch (error) {
        console.error('Error collecting reward:', error);
      }
    } else {
      // Handle task-specific navigation
      if (taskId === 'view-profile') {
        // Close modal and trigger highlight mode for profile
        onClose();
        setHighlightTaskId('view-profile');
      } else if (taskId === 'use-hacker-mode' || taskId === 'use-business-mode') {
        // Close modal and trigger highlight mode for theme switching
        // User will be guided to click profile icon on turf screen first
        onClose();
        setHighlightTaskId(taskId);
      } else if (taskId === 'change-avatar') {
        // Close modal and trigger highlight mode for avatar changing
        // User will be guided to click profile icon on turf screen first
        onClose();
        setHighlightTaskId(taskId);
      } else if (taskId === 'hide-task-list') {
        // Close modal and trigger highlight mode for hiding task guide
        // User will be guided to click profile icon on turf screen first
        onClose();
        setHighlightTaskId(taskId);
      } else if (taskId === 'visit-home') {
        // Close modal and trigger highlight mode for home location
        onClose();
        setHighlightTaskId(taskId);
      } else if (taskId === 'build-100-guardians') {
        // Check if user has sufficient funds ($100 minimum) before starting guided task
        if (currentBalance < 100) {
          // Show warning modal and don't start the guided task
          setShowInsufficientFundsModal(true);
          return;
        }
        // Check if a build is already in progress
        if (isBuildInProgress) {
          // Show warning modal and don't start the guided task
          setShowBuildInProgressModal(true);
          return;
        }
        // Close modal and trigger highlight mode for build-100-guardians
        // Reuses visit-home flow for initial step (home location)
        onClose();
        setHighlightTaskId(taskId);
      } else if (taskId === 'free-hack-rig') {
        // Check if user has completed the "Build 100 Guardians" task
        // This is more reliable than checking totalGuardiansBuilt from Redux
        // since Redux may not be updated immediately after building bots
        const build100GuardiansTaskId = 'build-100-guardians';
        const hasCompletedBuild100Guardians = completedTaskIds.has(build100GuardiansTaskId) || collectedTaskIds.has(build100GuardiansTaskId);
        
        if (!hasCompletedBuild100Guardians) {
          // Show locked feature modal and don't start the guided task
          setBlockedTaskId(taskId);
          setShowLockedFeatureModal(true);
          return;
        }
        // Close modal and trigger highlight mode for free-hack-rig
        // Reuses visit-home flow for initial step (home location)
        onClose();
        setHighlightTaskId(taskId);
      } else if (taskId === 'visit-hackmap') {
        // Check if user has completed the "Free Hack Rig" task
        // This ensures the Hack Rig is unlocked before guiding user to visit it
        const freeHackRigTaskId = 'free-hack-rig';
        const hasCompletedFreeHackRig = completedTaskIds.has(freeHackRigTaskId) || collectedTaskIds.has(freeHackRigTaskId);
        
        if (!hasCompletedFreeHackRig) {
          // Show locked feature modal and don't start the guided task
          setBlockedTaskId(taskId);
          setShowLockedFeatureModal(true);
          return;
        }
        // Close modal and trigger highlight mode for visit-hackmap
        // Will pan to center on Home Location and animate border
        onClose();
        setHighlightTaskId(taskId);
      } else if (taskId === 'visit-digital-barracks') {
        // Close modal and trigger highlight mode for visit-digital-barracks
        // Will pan to center on Digital Barracks and animate border
        onClose();
        setHighlightTaskId(taskId);
      } else {
        // For other tasks, just close modal for now
        onClose();
      }
    }
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Show next 10 tasks that are either incomplete or completed but not yet collected
  // After collection, tasks disappear from the list
  const visibleTasks = useMemo(() => {
    if (taskList.length === 0) {
      return [];
    }
    const sorted = [...taskList].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Filter to show only tasks that are:
    // 1. Not collected (incomplete or completed but reward not collected)
    // Tasks are filtered out only when they've been collected (reward given)
    const filtered = sorted.filter(task => {
      // Filter out tasks that have been collected (reward given)
      return !collectedTaskIds.has(task.id);
    });
    
    return filtered.slice(0, 10);
  }, [taskList, collectedTaskIds]);

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
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.overlayTouchable}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
          >
            <View
              style={[styles.modalContainer, { backgroundColor: colors.background, borderColor: colors.secondary }]}
            >
            <View style={[styles.header, { borderBottomColor: colors.secondary }]}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Task Guide
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.primary, borderColor: colors.secondary }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.tableHeader, { borderBottomColor: colors.secondary, backgroundColor: colors.secondary + '20' }]}>
              <Text style={[styles.headerText, styles.headerTaskTitle, { color: colors.text.primary }]}>Task</Text>
              <View style={styles.rightSection}>
                <Text style={[styles.headerText, styles.headerRewardAmount, { color: colors.text.primary }]}>Reward</Text>
                <Text style={[styles.headerText, styles.headerButton, { color: colors.text.primary }]}>Button</Text>
              </View>
            </View>

            {Platform.OS === 'ios' ? (
              <GestureScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={true}
                bounces={true}
              >
                {isLoading ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                  Loading tasks...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                  Error loading tasks
                </Text>
              </View>
            ) : visibleTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                  No tasks available
                </Text>
              </View>
            ) : (
              visibleTasks.map((task) => {
                const completed = isTaskCompleted(task.id);
                const rewardValue = task.reward?.value || 0;
                return (
                  <View 
                    key={task.id} 
                    style={[
                      styles.taskItem, 
                      { 
                        borderBottomColor: colors.secondary,
                      }
                    ]}
                  >
                    <Text 
                      style={[
                        styles.taskTitle, 
                        { 
                          color: colors.text.primary,
                        }
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {task.title || 'Untitled Task'}
                    </Text>
                    <View style={styles.rightSection}>
                      <Text 
                        style={[
                          styles.rewardAmount, 
                          { 
                            color: colors.text.secondary,
                          }
                        ]}
                      >
                        ${rewardValue}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: completed ? colors.matrix : colors.primary,
                            borderColor: completed ? colors.matrix : colors.secondary,
                          }
                        ]}
                        onPress={() => handleTaskAction(task.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.actionButtonText, { color: colors.background }]}>
                          {completed ? 'Collect' : "Let's Go!"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
                )}
              </GestureScrollView>
            ) : (
              <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                bounces={true}
                scrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {isLoading ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                      Loading tasks...
                    </Text>
                  </View>
                ) : error ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                      Error loading tasks
                    </Text>
                  </View>
                ) : visibleTasks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                      No tasks available
                    </Text>
                  </View>
                ) : (
                  visibleTasks.map((task) => {
                    const completed = isTaskCompleted(task.id);
                    const rewardValue = task.reward?.value || 0;
                    return (
                      <View 
                        key={task.id} 
                        style={[
                          styles.taskItem, 
                          { 
                            borderBottomColor: colors.secondary,
                          }
                        ]}
                      >
                        <Text 
                          style={[
                            styles.taskTitle, 
                            { 
                              color: colors.text.primary,
                            }
                          ]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {task.title || 'Untitled Task'}
                        </Text>
                        <View style={styles.rightSection}>
                          <Text 
                            style={[
                              styles.rewardAmount, 
                              { 
                                color: colors.text.secondary,
                              }
                            ]}
                          >
                            ${rewardValue}
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              {
                                backgroundColor: completed ? colors.matrix : colors.primary,
                                borderColor: completed ? colors.matrix : colors.secondary,
                              }
                            ]}
                            onPress={() => handleTaskAction(task.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.actionButtonText, { color: colors.background }]}>
                              {completed ? 'Collect' : "Let's Go!"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      </View>
      <LockedFeatureModal
        visible={showInsufficientFundsModal}
        title="INSUFFICIENT FUNDS"
        message="You need at least $100 to build 100 Guardian bots. Please earn more funds before starting this task."
        onClose={() => setShowInsufficientFundsModal(false)}
        closeButtonText="CLOSE"
      />
      <LockedFeatureModal
        visible={showBuildInProgressModal}
        title="BUILD IN PROGRESS"
        message="You already have a bot build in progress. Please wait for it to complete or speed it up before starting this guided task."
        onClose={() => setShowBuildInProgressModal(false)}
        closeButtonText="CLOSE"
      />
      <LockedFeatureModal
        visible={showLockedFeatureModal}
        title="LOCKED FEATURE"
        message={
          blockedTaskId === 'free-hack-rig'
            ? "You need to complete the 'Build 100 Guardians' task before you can unlock the Hack Rig."
            : "You need to complete the 'Free your Hack Rig' task before you can visit the Hackmap."
        }
        onClose={() => {
          setShowLockedFeatureModal(false);
          setBlockedTaskId(null);
        }}
        closeButtonText="CLOSE"
      />
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.lg,
    paddingVertical: SIZING.spacing.lg,
  },
  overlayTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: SCREEN_WIDTH * 0.75,
    maxWidth: 900,
    minWidth: 600,
    maxHeight: SCREEN_HEIGHT * 0.80,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZING.spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: SIZING.font.large,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    lineHeight: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: SIZING.spacing.lg,
    flexGrow: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderBottomWidth: 2,
    minHeight: 40,
  },
  headerText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerTaskTitle: {
    flex: 1,
    marginRight: SIZING.spacing.md,
  },
  headerRewardAmount: {
    width: 90,
    textAlign: 'right',
    marginRight: SIZING.spacing.md,
  },
  headerButton: {
    width: 120,
    textAlign: 'center',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.md,
    borderBottomWidth: 1,
    minHeight: 60,
  },
  taskTitle: {
    flex: 1,
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginRight: SIZING.spacing.md,
    flexShrink: 1,
    flexGrow: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  rewardAmount: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    width: 90,
    textAlign: 'right',
    marginRight: SIZING.spacing.md,
  },
  actionButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: SIZING.spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: SIZING.font.body,
  },
});

