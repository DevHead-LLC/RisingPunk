import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { createMockBotsContext, createTestWrapper } from '../utils/testSetup';
import { simulateBuildProcess, simulateQueueState, simulateBuildProgress } from '../utils/testActions';
import { TEST_IDS } from '../utils/testConstants';
import { setupTestEnvironment } from '../utils/testConfig';

describe('BotAssemblyScreen Queue Management', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = createMockBotsContext();
  const wrapper = createTestWrapper(mockBotsContext);

  setupTestEnvironment();

  it('should add builds to queue when factory is busy', async () => {
    const utils = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });

    simulateBuildProgress(mockBotsContext, 50, {
      type: 'breacher',
      quantity: 5
    });

    await simulateBuildProcess(utils, 'guardian', '3', true);

    expect(mockBotsContext.addToBuildQueue).toHaveBeenCalledWith({
      type: 'guardian',
      quantity: 3
    });
  });

  it('should start next build automatically after completion', async () => {
    const utils = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });

    simulateQueueState(mockBotsContext, [
      { type: 'guardian', quantity: 3 }
    ]);
    simulateBuildProgress(mockBotsContext, 100);

    expect(mockBotsContext.startBuilding).toHaveBeenCalledWith('guardian', 3);
    expect(mockBotsContext.removeFromBuildQueue).toHaveBeenCalled();
  });

  it('should allow queue reordering', async () => {
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });

    simulateQueueState(mockBotsContext, [
      { type: 'guardian', quantity: 3 },
      { type: 'phreak', quantity: 2 }
    ]);

    fireEvent.press(getByTestId(TEST_IDS.QUEUE_ITEM_UP(1)));
    expect(mockBotsContext.addToBuildQueue).toHaveBeenCalledWith(
      expect.arrayContaining([
        { type: 'phreak', quantity: 2 },
        { type: 'guardian', quantity: 3 }
      ])
    );
  });

  it('should handle queue cancellation', async () => {
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });

    simulateQueueState(mockBotsContext, [
      { type: 'guardian', quantity: 3 }
    ]);

    fireEvent.press(getByTestId(TEST_IDS.QUEUE_ITEM_CANCEL(0)));
    expect(mockBotsContext.removeFromBuildQueue).toHaveBeenCalledWith(0);
  });
}); 