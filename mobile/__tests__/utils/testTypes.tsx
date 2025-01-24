import { ReactNode } from 'react';

export type BotType = 'breacher' | 'guardian' | 'phreak';

export interface BuildQueueItem {
  type: BotType;
  quantity: number;
}

export interface BuildProgress {
  current: number;
  total: number;
  timeRemaining: number;
}

export interface TestWrapperProps {
  children: ReactNode;
}

export interface BuildError {
  response: {
    data: {
      error: string;
    };
  };
}

export interface MockBotCounts {
  breacher: number;
  guardian: number;
  phreak: number;
} 