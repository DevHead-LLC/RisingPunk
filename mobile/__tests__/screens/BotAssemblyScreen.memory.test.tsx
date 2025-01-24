import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen Memory Management', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = {
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    buildingProgress: null as null | number,
    selectedType: null,
    startBuilding: jest.fn(),
    selectBotType: jest.fn(),
    buildStartTime: null,
    totalBuildQuantity: 0
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  it('should cleanup timers on unmount', () => {
    const { unmount, getByTestId, getByText } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    
    // Start a build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));
    
    unmount();
    
    // Verify all timers are cleared
    const activeTimers = jest.getTimerCount();
    expect(activeTimers).toBe(0);
  });

  it('should cleanup API subscriptions on unmount', async () => {
    const cleanup = jest.fn();
    jest.spyOn(React, 'useEffect').mockImplementation(() => cleanup);
    
    const { unmount } = render(<BotAssemblyScreen onClose={mockOnClose} />, { wrapper });
    unmount();
    
    expect(cleanup).toHaveBeenCalled();
  });
}); 