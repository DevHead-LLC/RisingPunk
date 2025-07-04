import { createMovementMonitoring, clearMovementMonitoring } from '../../src/utils/movementMonitoring';

// Mock the nodeOwnership utility
jest.mock('../../src/utils/nodeOwnership', () => ({
  isNeutral: jest.fn(),
}));

describe('Step 4.2: Movement Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start monitoring when movement begins', () => {
    const mockFindAvailableTargets = jest.fn(() => []);
    const mockMoveBattalionAlongPath = jest.fn();
    const mockIsNeutral = require('../../src/utils/nodeOwnership').isNeutral;
    mockIsNeutral.mockReturnValue(true);

    const config = {
      battalionId: '1',
      target: { type: 'node', index: 3 },
      isUser: true,
      userBattalions: [],
      enemyBattalions: [],
      findAvailableTargets: mockFindAvailableTargets,
      moveBattalionAlongPath: mockMoveBattalionAlongPath,
      battalion: { id: '1', position: { x: 0, y: 0 }, quantity: 10, currentHealth: 100 }
    };

    const interval = createMovementMonitoring(config);

    // Fast-forward to trigger monitoring
    jest.advanceTimersByTime(2000);

    // Should have checked if target is still neutral
    expect(mockIsNeutral).toHaveBeenCalledWith(3);
    expect(interval).toBeTruthy();
  });

  it('should stop monitoring when cleared', () => {
    const mockFindAvailableTargets = jest.fn(() => []);
    const mockMoveBattalionAlongPath = jest.fn();
    const mockIsNeutral = require('../../src/utils/nodeOwnership').isNeutral;
    mockIsNeutral.mockReturnValue(true);

    const config = {
      battalionId: '1',
      target: { type: 'node', index: 3 },
      isUser: true,
      userBattalions: [],
      enemyBattalions: [],
      findAvailableTargets: mockFindAvailableTargets,
      moveBattalionAlongPath: mockMoveBattalionAlongPath,
      battalion: { id: '1', position: { x: 0, y: 0 }, quantity: 10, currentHealth: 100 }
    };

    const interval = createMovementMonitoring(config);

    // Clear monitoring
    clearMovementMonitoring(interval);

    // Fast-forward - should not trigger monitoring
    jest.advanceTimersByTime(2000);

    expect(mockIsNeutral).not.toHaveBeenCalled();
  });

  it('should retarget when target becomes invalid', () => {
    const mockFindAvailableTargets = jest.fn(() => [{ type: 'node', index: 4 }]);
    const mockMoveBattalionAlongPath = jest.fn();
    const mockIsNeutral = require('../../src/utils/nodeOwnership').isNeutral;
    
    // Target becomes invalid (not neutral) during monitoring
    mockIsNeutral.mockReturnValue(false);

    const config = {
      battalionId: '1',
      target: { type: 'node', index: 3 },
      isUser: true,
      userBattalions: [],
      enemyBattalions: [],
      findAvailableTargets: mockFindAvailableTargets,
      moveBattalionAlongPath: mockMoveBattalionAlongPath,
      battalion: { id: '1', position: { x: 0, y: 0 }, quantity: 10, currentHealth: 100 }
    };

    createMovementMonitoring(config);

    // Fast-forward to trigger monitoring
    jest.advanceTimersByTime(2000);

    // Should have found new targets and moved battalion
    expect(mockFindAvailableTargets).toHaveBeenCalled();
    expect(mockMoveBattalionAlongPath).toHaveBeenCalledWith(
      config.battalion,
      { type: 'node', index: 4 },
      true,
      [],
      []
    );
  });
}); 