import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BotAssembly } from '../../../src/components/home/BotAssembly';

describe('BotAssembly', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<BotAssembly onPress={mockOnPress} />);
    expect(getByText('BOT ASSEMBLY')).toBeTruthy();
    expect(getByText('Build your army')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = render(<BotAssembly onPress={mockOnPress} />);
    fireEvent.press(getByText('BOT ASSEMBLY'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
}); 