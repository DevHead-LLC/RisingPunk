import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen User Feedback', () => {
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

  it('should show loading indicators during state transitions', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    // Start build
    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    fireEvent.press(getByText('BUILD'));

    expect(getByTestId('build-loading-indicator')).toBeTruthy();
    expect(getByText('Initializing build...')).toBeTruthy();

    // Progress update
    act(() => {
      mockBotsContext.buildingProgress = 1;
    });

    expect(getByTestId('build-loading-indicator')).toBeFalsy();
  });

  it('should provide haptic feedback on important actions', () => {
    // TODO: Implement haptic feedback
    // const mockVibrate = jest.fn();
    // global.navigator.vibrate = mockVibrate;

    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    fireEvent.press(getByTestId('bot-card-breacher'));
    // expect(mockVibrate).toHaveBeenCalledWith(10);

    fireEvent.press(getByText('BUILD'));
    // expect(mockVibrate).toHaveBeenCalledWith(20);

    act(() => {
      mockBotsContext.buildingProgress = 100;
    });
    // expect(mockVibrate).toHaveBeenCalledWith(30);
  });

  it('should show appropriate progress animations', () => {
    const { getByTestId } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    act(() => {
      mockBotsContext.buildingProgress = 50;
    });

    const progressBar = getByTestId('progress-fill');
    expect(progressBar.props.style.width).toBe('50%');
    expect(progressBar.props.style.transition).toBe('width 0.3s ease-in-out');
  });

  it('should provide clear error states with recovery options', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    mockBotsContext.startBuilding.mockRejectedValueOnce(new Error('Network error'));

    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    
    await act(async () => {
      fireEvent.press(getByText('BUILD'));
    });

    expect(getByTestId('error-icon')).toBeTruthy();
    expect(getByText('Connection lost')).toBeTruthy();
    expect(getByTestId('retry-button')).toBeTruthy();
    expect(getByText('Tap to retry')).toBeTruthy();
  });

  it('should show build completion celebration', () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    act(() => {
      mockBotsContext.buildingProgress = 100;
      mockBotsContext.totalBuildQuantity = 5;
      mockBotsContext.selectedType = 'breacher';
    });

    expect(getByTestId('completion-animation')).toBeTruthy();
    expect(getByText('5 Breachers Ready!')).toBeTruthy();
    expect(getByTestId('confetti-effect')).toBeTruthy();
  });
}); 