import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type HighlightStep = 'settings-tab' | 'theme-toggle' | 'avatar-toggle' | 'task-guide-toggle' | 'garage-tab' | 'bot-assembly' | 'guardian-selection' | 'quantity-input' | 'build-button' | 'speedup-button' | 'hack-rig' | 'battalion-a' | 'guardians-selection' | 'assign-bots' | 'deploy-purge' | null;

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
    console.log('[TaskGuideHighlightContext] clearHighlight called');
    console.log('[TaskGuideHighlightContext] Current highlightTaskId:', highlightTaskId);
    console.log('[TaskGuideHighlightContext] Current highlightStep:', highlightStep);
    setHighlightTaskId(null);
    setHighlightStep(null);
    console.log('[TaskGuideHighlightContext] Highlight cleared - highlightTaskId set to null');
  }, [highlightTaskId, highlightStep]);

  const advanceHighlightStep = useCallback(() => {
    const isBuildGuardians = highlightTaskId === 'build-100-guardians';
    const isFreeHackRig = highlightTaskId === 'free-hack-rig';
    
    if (highlightStep === null) {
      if (isBuildGuardians) {
        setHighlightStep('garage-tab');
      } else if (isFreeHackRig) {
        setHighlightStep('hack-rig');
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
    } else if (isFreeHackRig) {
      if (highlightStep === 'hack-rig') {
        setHighlightStep('battalion-a');
      } else if (highlightStep === 'battalion-a') {
        setHighlightStep('guardians-selection');
      } else if (highlightStep === 'guardians-selection') {
        setHighlightStep('assign-bots');
      } else if (highlightStep === 'assign-bots') {
        setHighlightStep('deploy-purge');
      }
      // Note: 'deploy-purge' is the final step - guided task ends when deploy purge button is clicked
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

