import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { createMockBotsContext, createTestWrapper } from '../utils/testSetup';
import { simulateBuildProgress } from '../utils/testActions';
import { TEST_VALUES, TEST_IDS } from '../utils/testConstants';
import { setupTestEnvironment } from '../utils/testConfig';

describe('BotAssemblyScreen Performance', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = createMockBotsContext();
  const wrapper = createTestWrapper(mockBotsContext);

  setupTestEnvironment();

  it('should not re-render BuildControls on progress updates', async () => {
    const renderCount = jest.fn();
    jest.spyOn(React, 'useEffect').mockImplementation(() => renderCount());

    const { rerender } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    const initialRenders = renderCount.mock.calls.length;
    
    simulateBuildProgress(mockBotsContext, 20);
    rerender(<BotAssemblyScreen onClose={mockOnClose} />);
    
    simulateBuildProgress(mockBotsContext, 40);
    rerender(<BotAssemblyScreen onClose={mockOnClose} />);

    expect(renderCount.mock.calls.length - initialRenders).toBeLessThan(3);
  });

  it('should throttle quantity input updates', async () => {
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    
    const input = getByTestId(TEST_IDS.QUANTITY_INPUT);
    const changes = Array.from({ length: 100 }, (_, i) => String(i));
    
    changes.forEach(value => {
      fireEvent.changeText(input, value);
    });

    jest.runAllTimers();
    expect(mockBotsContext.selectBotType.mock.calls.length).toBeLessThan(changes.length);
  });

  it('should debounce quantity input updates', async () => {
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    
    const input = getByTestId(TEST_IDS.QUANTITY_INPUT);
    const rapidChanges = Array.from({ length: 10 }, (_, i) => String(i));
    
    rapidChanges.forEach(value => {
      fireEvent.changeText(input, value);
    });
    
    jest.advanceTimersByTime(TEST_VALUES.DEBOUNCE_DELAY);
    expect(mockBotsContext.selectBotType).toHaveBeenCalledTimes(1);
  });
});