import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TaskGuideHighlightContextType {
  highlightTaskId: string | null;
  setHighlightTaskId: (taskId: string | null) => void;
  clearHighlight: () => void;
}

const TaskGuideHighlightContext = createContext<TaskGuideHighlightContextType | undefined>(undefined);

export const TaskGuideHighlightProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);

  const clearHighlight = () => {
    setHighlightTaskId(null);
  };

  return (
    <TaskGuideHighlightContext.Provider value={{ highlightTaskId, setHighlightTaskId, clearHighlight }}>
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

