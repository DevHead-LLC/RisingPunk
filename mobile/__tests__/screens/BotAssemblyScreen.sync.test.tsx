import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen Progress Synchronization', () => {
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

  it('should sync progress with server updates', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));

    // Simulate server progress updates
    act(() => {
      mockBotsContext.buildingProgress = 20;
      mockBotsContext.buildStartTime = new Date();
    });

    expect(getByText('1/5')).toBeTruthy();
    expect(getByTestId('progress-fill')).toHaveStyle({ width: '20%' });
  });

  it('should handle progress desync gracefully', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Setup initial build state
    act(() => {
      mockBotsContext.buildingProgress = 50;
      mockBotsContext.totalBuildQuantity = 5;
      mockBotsContext.selectedType = 'breacher';
      mockBotsContext.buildStartTime = new Date(Date.now() - 5000); // 5 seconds ago
    });

    // Simulate server reporting different progress
    act(() => {
      mockBotsContext.buildingProgress = 30; // Server reports less progress
    });

    expect(getByText('Syncing progress...')).toBeTruthy();
    expect(getByTestId('progress-fill')).toHaveStyle({ width: '30%' });
  });

  it('should maintain build state during app suspension', async () => {
    const { getByTestId, getByText, rerender } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));

    // Simulate app going to background
    act(() => {
      mockBotsContext.buildingProgress = 40;
      mockBotsContext.buildStartTime = new Date(Date.now() - 4000); // 4 seconds ago
    });

    // Simulate app returning to foreground
    rerender(<BotAssemblyScreen onClose={mockOnClose} />);

    expect(getByText('2/5')).toBeTruthy();
    expect(getByTestId('progress-fill')).toHaveStyle({ width: '40%' });
  });

  it('should handle completion sync with server', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Setup near-complete build
    act(() => {
      mockBotsContext.buildingProgress = 98;
      mockBotsContext.totalBuildQuantity = 5;
      mockBotsContext.selectedType = 'breacher';
      mockBotsContext.buildStartTime = new Date(Date.now() - 9800); // 9.8 seconds ago
    });

    // Simulate server completion
    act(() => {
      mockBotsContext.buildingProgress = 100;
      mockBotsContext.botCounts = { ...mockBotsContext.botCounts, breacher: 5 };
    });

    expect(getByText('Build Complete')).toBeTruthy();
    expect(getByText('5/5')).toBeTruthy();
    expect(mockBotsContext.setBotCounts).toHaveBeenCalled();
  });
}); 