import React from 'react';
import { render } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { createMockBotsContext, createTestWrapper } from '../utils/testSetup';
import { simulateBuildProcess, simulateBuildProgress } from '../utils/testActions';
import { TEST_IDS } from '../utils/testConstants';
import { setupTestEnvironment } from '../utils/testConfig';

describe('BotAssemblyScreen Progress Synchronization', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = createMockBotsContext();
  const wrapper = createTestWrapper(mockBotsContext);

  setupTestEnvironment();

  it('should handle progress desync gracefully', async () => {
    const utils = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });

    simulateBuildProgress(mockBotsContext, 50, {
      type: 'breacher',
      quantity: 5,
      startTime: new Date(Date.now() - 5000)
    });

    simulateBuildProgress(mockBotsContext, 30);

    expect(utils.getByText('Syncing progress...')).toBeTruthy();
    expect(utils.getByTestId(TEST_IDS.PROGRESS_FILL)).toHaveStyle({ width: '30%' });
  });

  it('should maintain build state during app suspension', async () => {
    const utils = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });

    await simulateBuildProcess(utils, 'breacher', '5');

    simulateBuildProgress(mockBotsContext, 40, {
      startTime: new Date(Date.now() - 4000)
    });

    utils.rerender(<BotAssemblyScreen onClose={mockOnClose} />);

    expect(utils.getByText('2/5')).toBeTruthy();
    expect(utils.getByTestId(TEST_IDS.PROGRESS_FILL)).toHaveStyle({ width: '40%' });
  });

  it('should handle completion sync with server', async () => {
    const utils = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });

    simulateBuildProgress(mockBotsContext, 98, {
      type: 'breacher',
      quantity: 5,
      startTime: new Date(Date.now() - 9800)
    });

    simulateBuildProgress(mockBotsContext, 100);
    mockBotsContext.botCounts = { ...mockBotsContext.botCounts, breacher: 5 };

    expect(utils.getByText('Build Complete')).toBeTruthy();
    expect(utils.getByText('5/5')).toBeTruthy();
    expect(mockBotsContext.setBotCounts).toHaveBeenCalled();
  });
}); 