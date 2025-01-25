import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen Performance', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = {
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    buildingProgress: null as null | number,
    selectedType: null,
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    buildStartTime: null,
    totalBuildQuantity: 0,
    setBuildingProgress: jest.fn(),
    setBotCounts: jest.fn()
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  it('should not re-render BuildControls on progress updates', async () => {
    const renderCount = jest.fn();
    jest.spyOn(React, 'useEffect').mockImplementation(() => renderCount());

    const { rerender } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    
    const initialRenders = renderCount.mock.calls.length;
    
    // Update progress multiple times
    act(() => {
      mockBotsContext.buildingProgress = 20;
    });
    rerender(<BotAssemblyScreen onClose={mockOnClose} />);
    
    act(() => {
      mockBotsContext.buildingProgress = 40;
    });
    rerender(<BotAssemblyScreen onClose={mockOnClose} />);

    // Should only re-render BuildTimer, not entire screen
    expect(renderCount.mock.calls.length - initialRenders).toBeLessThan(3);
  });

  it('should throttle quantity input updates', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    
    const input = getByTestId('quantity-input');
    const changes = Array.from({ length: 100 }, (_, i) => String(i));
    
    changes.forEach(value => {
      fireEvent.changeText(input, value);
    });

    jest.runAllTimers();
    
    // Should have debounced/throttled the updates
    expect(mockBotsContext.selectBotType.mock.calls.length).toBeLessThan(changes.length);
  });

  it('should debounce quantity input updates', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    
    const input = getByTestId('quantity-input');
    const rapidChanges = Array.from({ length: 10 }, (_, i) => String(i));
    
    rapidChanges.forEach(value => {
      fireEvent.changeText(input, value);
    });
    
    jest.advanceTimersByTime(300); // Debounce timeout
    expect(mockBotsContext.selectBotType).toHaveBeenCalledTimes(1);
  });
}); 