import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SIZING } from '../../styles/theme';
import { useGetCurrentTaskGuideTaskQuery } from '../../store/api/userGuideApi';
import { TaskGuideModal } from '../modals/TaskGuideModal';

type TaskGuideProps = {
  currentScreen: string;
  onNavigateToProfile?: () => void;
};

export const TaskGuide = memo(({ currentScreen, onNavigateToProfile }: TaskGuideProps) => {
  const colors = useThemeColors();
  const [taskGuideColorIndex, setTaskGuideColorIndex] = useState(0);
  const taskGuideAnimatedColor = useState(new Animated.Value(0))[0];
  const [modalVisible, setModalVisible] = useState(false);

  const taskGuideColors = [colors.matrix, colors.secondary];

  const { data, isLoading, error } = useGetCurrentTaskGuideTaskQuery(undefined, {
    skip: currentScreen !== 'turf',
  });

  // Show if on turf screen
  const shouldShow = currentScreen === 'turf';
  
  // Default to showing if API hasn't returned yet, otherwise respect the setting
  const showTaskGuide = data === undefined ? true : (data?.showTaskGuide !== false);

  useEffect(() => {
    if (shouldShow && showTaskGuide) {
      // Start with first color, then change every 60 seconds
      // Trigger initial animation
      Animated.timing(taskGuideAnimatedColor, {
        toValue: 0,
        duration: 0,
        useNativeDriver: false,
      }).start();

      const interval = setInterval(() => {
        setTaskGuideColorIndex(prev => (prev + 1) % taskGuideColors.length);
      }, 60000); // Change color every 60 seconds

      return () => clearInterval(interval);
    }
  }, [shouldShow, showTaskGuide, taskGuideColors.length, taskGuideAnimatedColor]);

  useEffect(() => {
    if (shouldShow && showTaskGuide) {
      Animated.timing(taskGuideAnimatedColor, {
        toValue: taskGuideColorIndex,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [taskGuideColorIndex, shouldShow, showTaskGuide, taskGuideAnimatedColor]);

  const taskGuideAnimatedColorValue = taskGuideAnimatedColor.interpolate({
    inputRange: [0, 1],
    outputRange: taskGuideColors,
  });

  const styles = useMemo(() => createTaskGuideStyles(colors), [colors]);

  if (!shouldShow || !showTaskGuide) {
    return null;
  }

  // Always show "Next Task" as the title
  const displayTitle = 'Next Task';
  
  // Check if current task is completed (action done) but not collected (reward not given)
  const currentTaskId = data?.currentTask?.id;
  const completedTaskIds = new Set(data?.completedTaskIds || []);
  const collectedTaskIds = new Set(data?.collectedTaskIds || []);
  // Task is completed if it's in completedTaskIds but not yet in collectedTaskIds
  const isCurrentTaskCompleted = currentTaskId 
    ? (completedTaskIds.has(currentTaskId) && !collectedTaskIds.has(currentTaskId))
    : false;
  
  // Show "Collect Reward!" if task is completed, otherwise show description
  const displayDescription = isCurrentTaskCompleted 
    ? 'Collect Reward!' 
    : (data?.currentTask?.description || 'Tap to view');

  const handlePress = () => {
    setModalVisible(true);
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
    left: SIZING.spacing.lg,
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

