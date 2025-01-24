import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen Queue Management', () => {
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
    buildQueue: [] as Array<{type: 'breacher' | 'guardian' | 'phreak', quantity: number}>,
    addToBuildQueue: jest.fn(),
    removeFromBuildQueue: jest.fn()
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

  it('should add builds to queue when factory is busy', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start first build
    act(() => {
      mockBotsContext.buildingProgress = 50;
      mockBotsContext.selectedType = 'breacher';
      mockBotsContext.totalBuildQuantity = 5;
    });

    // Queue second build
    fireEvent.press(getByTestId('bot-card-guardian'));
    fireEvent.changeText(getByTestId('quantity-input'), '3');
    fireEvent.press(getByText('ADD TO QUEUE'));

    expect(mockBotsContext.addToBuildQueue).toHaveBeenCalledWith({
      type: 'guardian',
      quantity: 3
    });
    expect(getByText('Queued: 3 Guardian')).toBeTruthy();
  });

  it('should start next build automatically after completion', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Setup queue
    act(() => {
      mockBotsContext.buildQueue = [
        { type: 'guardian', quantity: 3 }
      ];
      mockBotsContext.buildingProgress = 100; // Current build complete
    });

    expect(mockBotsContext.startBuilding).toHaveBeenCalledWith('guardian', 3);
    expect(mockBotsContext.removeFromBuildQueue).toHaveBeenCalled();
  });

  it('should allow queue reordering', async () => {
    const { getByTestId } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    act(() => {
      mockBotsContext.buildQueue = [
        { type: 'guardian', quantity: 3 },
        { type: 'phreak', quantity: 2 }
      ];
    });

    fireEvent.press(getByTestId('queue-item-1-up'));
    expect(mockBotsContext.addToBuildQueue).toHaveBeenCalledWith(
      expect.arrayContaining([
        { type: 'phreak', quantity: 2 },
        { type: 'guardian', quantity: 3 }
      ])
    );
  });

  it('should handle queue cancellation', async () => {
    const { getByTestId } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    act(() => {
      mockBotsContext.buildQueue = [
        { type: 'guardian', quantity: 3 }
      ];
    });

    fireEvent.press(getByTestId('queue-item-0-cancel'));
    expect(mockBotsContext.removeFromBuildQueue).toHaveBeenCalledWith(0);
  });
}); 