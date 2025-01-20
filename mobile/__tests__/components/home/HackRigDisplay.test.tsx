import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HackRigDisplay } from '../../../src/components/home/HackRigDisplay';

describe('HackRigDisplay', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<HackRigDisplay onPress={mockOnPress} />);
    expect(getByText('HACK RIG')).toBeTruthy();
    expect(getByText('Access the network')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = render(<HackRigDisplay onPress={mockOnPress} />);
    fireEvent.press(getByText('HACK RIG'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
}); 