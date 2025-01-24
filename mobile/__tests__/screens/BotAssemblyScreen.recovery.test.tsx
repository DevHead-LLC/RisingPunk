import React from 'react';
import { render, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen State Recovery', () => {
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
    setBotCounts: jest.fn(),
    recoverBuildState: jest.fn()
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BotsContext.Provider value={mockBotsContext}>
      {children}
    </BotsContext.Provider>
  );

  it('should recover interrupted build state from server', async () => {
    const { getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    act(() => {
      mockBotsContext.recoverBuildState.mockResolvedValueOnce({
        type: 'breacher',
        quantity: 5,
        progress: 60
      });
    });

    expect(getByText('Recovering build state...')).toBeTruthy();
    expect(mockBotsContext.setBuildingProgress).toHaveBeenCalledWith(60);
  });
}); 