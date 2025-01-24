import React from 'react';
import { BotsContext } from '../../src/context/BotsContext';
import { BotType, BuildQueueItem, TestWrapperProps } from './testTypes';
import { BalanceProvider } from '../../src/context/BalanceContext';
import { BotsProvider } from '../../src/context/BotsContext';

export interface MockBotsContextType {
  botCounts: { breacher: number; guardian: number; phreak: number };
  buildingProgress: null | number;
  selectedType: null | BotType;
  startBuilding: jest.Mock;
  selectBotType: jest.Mock;
  buildStartTime: null | Date;
  totalBuildQuantity: number;
  setBuildingProgress: jest.Mock;
  setBotCounts: jest.Mock;
  buildQueue?: BuildQueueItem[];
  addToBuildQueue?: jest.Mock;
  removeFromBuildQueue?: jest.Mock;
}

export const createMockBotsContext = (overrides = {}): MockBotsContextType => ({
  botCounts: { breacher: 0, guardian: 0, phreak: 0 },
  buildingProgress: null,
  selectedType: null,
  startBuilding: jest.fn(),
  selectBotType: jest.fn(),
  buildStartTime: null,
  totalBuildQuantity: 0,
  setBuildingProgress: jest.fn(),
  setBotCounts: jest.fn(),
  buildQueue: [],
  addToBuildQueue: jest.fn(),
  removeFromBuildQueue: jest.fn(),
  ...overrides
});

export const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BalanceProvider initialBalance={1000}>
    <BotsProvider>
      {children}
    </BotsProvider>
  </BalanceProvider>
);

export const setupTimers = () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
}; 