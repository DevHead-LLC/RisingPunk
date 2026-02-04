import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useGetCurrentTaskGuideTaskQuery, useTrackTaskGuidePillTapMutation } from '../../store/api/userGuideApi';
import { TaskGuideModal } from '../modals/TaskGuideModal';

type TaskGuideProps = {
  currentScreen: string;
  onNavigateToProfile?: () => void;
};

const ATTENTION_INTERVAL_MS = 1000;
const CALM_INTERVAL_MS = 60000;

export const TaskGuide = memo(({ currentScreen, onNavigateToProfile }: TaskGuideProps) => {
  const colors = useThemeColors();
  const [taskGuideColorIndex, setTaskGuideColorIndex] = useState(0);
  const taskGuideAnimatedColor = useState(new Animated.Value(0))[0];
  const [modalVisible, setModalVisible] = useState(false);
  const [trackTaskGuidePillTap] = useTrackTaskGuidePillTapMutation();

  const taskGuideColors = [colors.matrix, colors.secondary];

  const { data, isLoading, error } = useGetCurrentTaskGuideTaskQuery(undefined, {
    skip: currentScreen !== 'turf',
  });

  const shouldShow = currentScreen === 'turf';
  const showTaskGuide = data === undefined ? true : (data?.showTaskGuide !== false);
  const pillTappedOnce = data?.taskGuidePillTappedOnce === true;

  useEffect(() => {
    if (!shouldShow || !showTaskGuide) return;
    Animated.timing(taskGuideAnimatedColor, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    }).start();

    const intervalMs = pillTappedOnce ? CALM_INTERVAL_MS : ATTENTION_INTERVAL_MS;
    const interval = setInterval(() => {
      setTaskGuideColorIndex(prev => (prev + 1) % taskGuideColors.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [shouldShow, showTaskGuide, pillTappedOnce, taskGuideColors.length, taskGuideAnimatedColor]);

  useEffect(() => {
    if (shouldShow && showTaskGuide) {
      const duration = pillTappedOnce ? 500 : 400;
      Animated.timing(taskGuideAnimatedColor, {
        toValue: taskGuideColorIndex,
        duration,
        useNativeDriver: false,
      }).start();
    }
  }, [taskGuideColorIndex, shouldShow, showTaskGuide, pillTappedOnce, taskGuideAnimatedColor]);

  const taskGuideAnimatedColorValue = taskGuideAnimatedColor.interpolate({
    inputRange: [0, 1],
    outputRange: taskGuideColors,
  });

  const styles = useMemo(() => createTaskGuideStyles(colors), [colors]);

  if (!shouldShow || !showTaskGuide) {
    return null;
  }

  // Check if there are any tasks available (only after data has loaded)
  const hasCurrentTask = !isLoading && !!data?.currentTask;
  const hasNoTasks = !isLoading && data && !data.currentTask;
  
  // Show "Next Task" as title, or "More Tasks Coming Soon" if no tasks (but not while loading)
  const displayTitle = hasNoTasks ? 'More Tasks Coming Soon' : 'Next Task';
  
  // Check if current task is completed (action done) but not collected (reward not given)
  const currentTaskId = data?.currentTask?.id;
  const completedTaskIds = new Set(data?.completedTaskIds || []);
  const collectedTaskIds = new Set(data?.collectedTaskIds || []);
  // Task is completed if it's in completedTaskIds but not yet in collectedTaskIds
  const isCurrentTaskCompleted = currentTaskId 
    ? (completedTaskIds.has(currentTaskId) && !collectedTaskIds.has(currentTaskId))
    : false;
  
  // Show "Collect Reward!" if task is completed, otherwise show description, or "more tasks coming soon"
  const displayDescription = hasNoTasks
    ? 'Tap to view'
    : (isCurrentTaskCompleted 
        ? 'Collect Reward!' 
        : (data?.currentTask?.description || 'Tap to view'));

  const handlePress = () => {
    setModalVisible(true);
    if (!pillTappedOnce) {
      void trackTaskGuidePillTap();
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        style={styles.touchableContainer}
      >
        <Animated.View 
          style={[
            styles.taskGuideContainer,
            {
              backgroundColor: colors.accent + 'CC',
              borderColor: taskGuideAnimatedColorValue,
            }
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.taskGuideTitle, { color: colors.text.primary }]}>
            {displayTitle}
          </Text>
          <Text style={[styles.taskGuideDescription, { color: colors.text.secondary }]}>
            {displayDescription}
          </Text>
        </Animated.View>
      </TouchableOpacity>
      <TaskGuideModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
        }}
        onNavigateToProfile={onNavigateToProfile}
      />
    </>
  );
});

const createTaskGuideStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  touchableContainer: {
    position: 'absolute',
    bottom: SIZING.spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 500,
  },
  taskGuideContainer: {
    padding: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.sm,
    borderRadius: 4,
    borderWidth: 1,
    maxWidth: 200,
  },
  taskGuideTitle: {
    fontSize: SIZING.font.small,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.xs / 2,
  },
  taskGuideDescription: {
    fontSize: SIZING.font.small - 2,
  },
});

