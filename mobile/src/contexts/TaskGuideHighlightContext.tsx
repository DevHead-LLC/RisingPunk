import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type HighlightStep = 'settings-tab' | 'theme-toggle' | 'avatar-toggle' | 'task-guide-toggle' | 'garage-tab' | 'bot-assembly' | 'guardian-selection' | 'quantity-input' | 'build-button' | 'speedup-button' | null;

interface TaskGuideHighlightContextType {
  highlightTaskId: string | null;
  highlightStep: HighlightStep;
  setHighlightTaskId: (taskId: string | null) => void;
  setHighlightStep: (step: HighlightStep) => void;
  clearHighlight: () => void;
  advanceHighlightStep: () => void;
}

const TaskGuideHighlightContext = createContext<TaskGuideHighlightContextType | undefined>(undefined);

export const TaskGuideHighlightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [highlightStep, setHighlightStep] = useState<HighlightStep>(null);

  const clearHighlight = useCallback(() => {
    setHighlightTaskId(null);
    setHighlightStep(null);
  }, []);

  const advanceHighlightStep = useCallback(() => {
    const isBuildGuardians = highlightTaskId === 'build-100-guardians';
    
    if (highlightStep === null) {
      if (isBuildGuardians) {
        setHighlightStep('garage-tab');
      } else {
        setHighlightStep('settings-tab');
      }
    } else if (highlightStep === 'settings-tab') {
      const isThemeTask = highlightTaskId === 'use-hacker-mode' || highlightTaskId === 'use-business-mode';
      const isAvatarTask = highlightTaskId === 'change-avatar';
      const isHideTaskListTask = highlightTaskId === 'hide-task-list';
      if (isThemeTask) {
        setHighlightStep('theme-toggle');
      } else if (isAvatarTask) {
        setHighlightStep('avatar-toggle');
      } else if (isHideTaskListTask) {
        setHighlightStep('task-guide-toggle');
      }
    } else if (isBuildGuardians) {
      if (highlightStep === 'garage-tab') {
        setHighlightStep('bot-assembly');
      } else if (highlightStep === 'bot-assembly') {
        setHighlightStep('guardian-selection');
      } else if (highlightStep === 'guardian-selection') {
        setHighlightStep('quantity-input');
      } else if (highlightStep === 'quantity-input') {
        setHighlightStep('build-button');
      }
      // Note: 'build-button' is the final step - guided task ends when build button is clicked
      // No advancement to 'speedup-button' - user can discover speedup feature on their own
    }
  }, [highlightStep, highlightTaskId]);

  const handleSetHighlightTaskId = useCallback((taskId: string | null) => {
    setHighlightTaskId(taskId);
    setHighlightStep(null);
  }, []);

  return (
    <TaskGuideHighlightContext.Provider value={{ 
      highlightTaskId, 
      highlightStep,
      setHighlightTaskId: handleSetHighlightTaskId, 
      setHighlightStep,
      clearHighlight,
      advanceHighlightStep
    }}>
      {children}
    </TaskGuideHighlightContext.Provider>
  );
};

export const useTaskGuideHighlight = () => {
  const context = useContext(TaskGuideHighlightContext);
  if (context === undefined) {
    throw new Error('useTaskGuideHighlight must be used within a TaskGuideHighlightProvider');
  }
  return context;
};

