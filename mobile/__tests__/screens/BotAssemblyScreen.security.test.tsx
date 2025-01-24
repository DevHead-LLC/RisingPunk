import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BotAssemblyScreen } from '../../src/screens/BotAssemblyScreen';
import { BotsContext } from '../../src/context/BotsContext';

describe('BotAssemblyScreen Security', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should prevent rapid build requests', async () => {
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />, 
      { wrapper }
    );

    // Attempt multiple rapid builds
    for (let i = 0; i < 3; i++) {
      fireEvent.press(getByTestId('bot-card-breacher'));
      fireEvent.changeText(getByTestId('quantity-input'), '1');
      fireEvent.press(getByText('BUILD'));
    }

    expect(mockBotsContext.startBuilding).toHaveBeenCalledTimes(1);
    expect(getByText('Please wait before starting another build')).toBeTruthy();
  });

  it('should handle network errors gracefully', async () => {
    mockBotsContext.startBuilding.mockRejectedValueOnce(new Error('Network error'));
    
    const { getByTestId, getByText } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    fireEvent.press(getByTestId('bot-card-breacher'));
    fireEvent.changeText(getByTestId('quantity-input'), '5');
    
    await act(async () => {
      fireEvent.press(getByText('BUILD'));
    });

    expect(getByText('Connection lost. Retrying...')).toBeTruthy();
    expect(getByTestId('retry-button')).toBeTruthy();
  });

  it('should validate input against XSS attempts', () => {
    const { getByTestId } = render(
      <BotAssemblyScreen onClose={mockOnClose} />,
      { wrapper }
    );

    const maliciousInputs = [
      '<script>alert(1)</script>',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>'
    ];

    maliciousInputs.forEach(input => {
      fireEvent.changeText(getByTestId('quantity-input'), input);
      expect(getByTestId('quantity-input').props.value).toBe('');
    });
  });
}); 