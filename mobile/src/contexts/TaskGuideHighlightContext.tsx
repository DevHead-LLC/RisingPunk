import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type HighlightStep = 'settings-tab' | 'theme-toggle' | 'avatar-toggle' | null;

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
    if (highlightStep === null) {
      setHighlightStep('settings-tab');
    } else if (highlightStep === 'settings-tab') {
      const isThemeTask = highlightTaskId === 'use-hacker-mode' || highlightTaskId === 'use-business-mode';
      const isAvatarTask = highlightTaskId === 'change-avatar';
      if (isThemeTask) {
        setHighlightStep('theme-toggle');
      } else if (isAvatarTask) {
        setHighlightStep('avatar-toggle');
      }
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

