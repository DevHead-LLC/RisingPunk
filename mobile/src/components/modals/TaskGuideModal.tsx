import React, { useMemo } from 'react';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TaskGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TaskGuideModal: React.FC<TaskGuideModalProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const { data, isLoading, error } = useGetCurrentTaskGuideTaskQuery(undefined, {
    skip: false, // Always fetch, don't skip
  });
  const [completeTask] = useCompleteTaskGuideTaskMutation();
  const { setHighlightTaskId } = useTaskGuideHighlight();

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
                              {completed ? `Collect $${rewardValue}!` : "Let's Go!"}
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
    width: 60,
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
    width: 60,
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

