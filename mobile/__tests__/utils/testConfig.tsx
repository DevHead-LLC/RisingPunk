import { MockBotsContextType } from './testSetup';
import { testDb } from './testDb';
import { mockServerResponses } from './testServer';

export const defaultMockContextConfig: MockBotsContextType = {
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
  removeFromBuildQueue: jest.fn()
};

export const setupTestEnvironment = () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    testDb.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
};

export const mockNetworkConditions = {
  simulateLatency: () => jest.advanceTimersByTime(100),
  simulateTimeout: () => new Promise(resolve => setTimeout(resolve, 5000)),
  simulateOffline: () => {
    mockServerResponses.startBuild = jest.fn().mockRejectedValue(new Error('Network error'));
  }
}; 