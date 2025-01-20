import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';

describe('HomeScreen', () => {
  const mockProps = {
    onClose: jest.fn(),
    onNavigateToMap: jest.fn(),
    onNavigateToBotAssembly: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all components correctly', () => {
    const { getByText } = render(<HomeScreen {...mockProps} />);
    expect(getByText('HACK RIG')).toBeTruthy();
    expect(getByText('BOT ASSEMBLY')).toBeTruthy();
  });

  it('calls onNavigateToMap when HackRig is pressed', () => {
    const { getByText } = render(<HomeScreen {...mockProps} />);
    fireEvent.press(getByText('HACK RIG'));
    expect(mockProps.onNavigateToMap).toHaveBeenCalled();
  });

  it('calls onNavigateToBotAssembly when BotAssembly is pressed', () => {
    const { getByText } = render(<HomeScreen {...mockProps} />);
    fireEvent.press(getByText('BOT ASSEMBLY'));
    expect(mockProps.onNavigateToBotAssembly).toHaveBeenCalled();
  });

  it('calls onClose when CloseButton is pressed', () => {
    const { getByTestId } = render(<HomeScreen {...mockProps} />);
    fireEvent.press(getByTestId('close-button'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });
}); 