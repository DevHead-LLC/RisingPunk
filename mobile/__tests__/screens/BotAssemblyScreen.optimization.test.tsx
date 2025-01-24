import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen Build Optimization', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = {
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    buildingProgress: null as null | number,
    selectedType: null as null | 'breacher' | 'guardian' | 'phreak',
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    buildStartTime: null as null | Date,
    totalBuildQuantity: 0,
    setBuildingProgress: jest.fn(),
    setBotCounts: jest.fn()
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should batch bot count updates', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start large build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '100');
    fireEvent.press(getByText('BUILD'));

    // Simulate rapid progress updates
    for (let i = 0; i < 100; i++) {
      act(() => {
        mockBotsContext.buildingProgress = i;
      });
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

    jest.advanceTimersByTime(300); // Debounce delay

    // Should only process final value
    expect(mockBotsContext.selectBotType).toHaveBeenCalledTimes(1);
  });

  it('should optimize large build renders', async () => {
    const renderCount = jest.fn();
    jest.spyOn(React, 'useEffect').mockImplementation(() => renderCount());

    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start large build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '1000');
    fireEvent.press(getByText('BUILD'));

    const initialRenders = renderCount.mock.calls.length;

    // Simulate many progress updates
    for (let i = 0; i < 100; i++) {
      act(() => {
        mockBotsContext.buildingProgress = i;
      });
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