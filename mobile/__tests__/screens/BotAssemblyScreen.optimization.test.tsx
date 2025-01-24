import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';
import { createMockBotsContext, createTestWrapper } from '../utils/testSetup';
import { simulateBuildProcess, simulateBuildProgress } from '../utils/testActions';
import { TEST_VALUES } from '../utils/testConstants';
import { setupTestEnvironment } from '../utils/testConfig';

describe('BotAssemblyScreen Build Optimization', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = createMockBotsContext();
  const wrapper = createTestWrapper(mockBotsContext);

  setupTestEnvironment();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should batch bot count updates', async () => {
    const utils = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    await simulateBuildProcess(utils, 'breacher', '100');

    // Simulate rapid progress updates
    for (let i = 0; i < 100; i++) {
      simulateBuildProgress(mockBotsContext, i);
    }

    // Should batch updates instead of calling for each progress change
    expect(mockBotsContext.setBotCounts).toHaveBeenCalledTimes(1);
  });

  it('should debounce quantity input updates', async () => {
    const { getByTestId } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    const input = getByTestId('quantity-input');
    
    // Simulate rapid typing
    for (let i = 1; i <= 5; i++) {
      fireEvent.changeText(input, i.toString());
    }

    jest.advanceTimersByTime(TEST_VALUES.DEBOUNCE_DELAY);

    // Should only process final value
    expect(mockBotsContext.selectBotType).toHaveBeenCalledTimes(1);
  });

  it('should optimize large build renders', async () => {
    const renderCount = jest.fn();
    jest.spyOn(React, 'useEffect').mockImplementation(() => renderCount());

    const utils = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    const initialRenders = renderCount.mock.calls.length;

    await simulateBuildProcess(utils, 'breacher', TEST_VALUES.LARGE_BUILD_QUANTITY.toString());

    // Simulate many progress updates
    for (let i = 0; i < 100; i++) {
      simulateBuildProgress(mockBotsContext, i);
    }

    // Should use memo/callback optimizations to prevent excessive renders
    expect(renderCount.mock.calls.length - initialRenders).toBeLessThan(10);
  });

  it('should cleanup memory during large builds', async () => {
    const { getByTestId, getByText, unmount } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start large build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '1000');
    fireEvent.press(getByText('BUILD'));

    const initialMemory = process.memoryUsage().heapUsed;

    // Simulate many progress updates
    for (let i = 0; i < 100; i++) {
      act(() => {
        mockBotsContext.buildingProgress = i;
      });
    }

    unmount();

    // Check memory cleanup
    const memoryAfterCleanup = process.memoryUsage().heapUsed;
    expect(memoryAfterCleanup).toBeLessThanOrEqual(initialMemory * 1.1); // Allow 10% overhead
  });
}); 