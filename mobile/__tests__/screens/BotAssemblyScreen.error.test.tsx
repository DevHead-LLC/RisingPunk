import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen Error Recovery', () => {
  const mockOnClose = jest.fn();
  const mockBotsContext = {
    botCounts: { breacher: 0, guardian: 0, phreak: 0 },
    buildingProgress: null as null | number,
    selectedType: null as null | 'breacher' | 'guardian' | 'phreak',
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should handle build interruption', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));

    // Simulate connection loss during build
    act(() => {
      mockBotsContext.buildingProgress = 50;
    });

    // Simulate error
    mockBotsContext.setBuildingProgress.mockRejectedValueOnce(new Error('Connection lost'));

    expect(getByText('Build interrupted')).toBeTruthy();
    expect(getByTestId('resume-build-button')).toBeTruthy();
  });

  it('should resume interrupted build', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Setup interrupted state
    act(() => {
      mockBotsContext.buildingProgress = 50;
      mockBotsContext.totalBuildQuantity = 5;
      mockBotsContext.selectedType = 'breacher';
    });

    fireEvent.press(getByTestId('resume-build-button'));
    
    expect(mockBotsContext.startBuilding).toHaveBeenCalledWith('breacher', 5);
    expect(getByText('Resuming build...')).toBeTruthy();
  });

  it('should handle server-side build failures', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    mockBotsContext.startBuilding.mockRejectedValueOnce({
      response: { 
        data: { 
          error: 'Server maintenance in progress',
          retryAfter: 300
        }
      }
    });

    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    
    await act(async () => {
      fireEvent.press(getByText('BUILD'));
    });

    expect(getByText('Server maintenance in progress')).toBeTruthy();
    expect(getByText('Retry available in: 5:00')).toBeTruthy();
  });
}); 