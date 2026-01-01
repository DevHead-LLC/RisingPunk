export interface CurrentTask {
  id: string;
  title: string;
  description: string;
}

export interface TaskProgress {
  completed: number;
  total: number;
}

export interface TaskListItem {
  id: string;
  title: string;
  description: string;
  order: number;
  reward?: {
    type: string;
    value: number;
  };
  howTo?: string;
}

export interface CurrentTaskResponse {
  success: boolean;
  currentTask: CurrentTask | null;
  progress: TaskProgress;
  showTaskGuide: boolean;
  taskList?: TaskListItem[];
  completedTaskIds?: string[];
  collectedTaskIds?: string[];
}

export interface CompleteTaskRequest {
  taskId: string;
}

export interface CompleteTaskResponse {
  success: boolean;
  message?: string;
}

export interface SkipTaskRequest {
  taskId: string;
}

export interface SkipTaskResponse {
  success: boolean;
  message?: string;
}

export interface UpdateVisibilityRequest {
  showTaskGuide: boolean;
}

export interface UpdateVisibilityResponse {
  success: boolean;
  showTaskGuide: boolean;
}

export interface TrackProfileVisitResponse {
  success: boolean;
  message?: string;
}

export interface TrackThemeChangeRequest {
  theme: 'dark' | 'light';
}

export interface TrackThemeChangeResponse {
  success: boolean;
  message?: string;
}

export interface TrackAvatarChangeResponse {
  success: boolean;
  message?: string;
}

export interface TrackHomeVisitResponse {
  success: boolean;
  message?: string;
}

export interface TrackHackmapVisitResponse {
  success: boolean;
  message?: string;
}

export interface TrackDigitalBarracksVisitResponse {
  success: boolean;
  message?: string;
}

export interface TrackWalletViewResponse {
  success: boolean;
  message?: string;
}

