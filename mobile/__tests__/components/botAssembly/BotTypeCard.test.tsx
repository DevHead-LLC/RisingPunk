import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BotTypeCard } from '../../../src/components/botAssembly/BotTypeCard';

describe('BotTypeCard', () => {
  const defaultProps = {
    type: 'breacher' as const,
    level: 1,
    isLocked: false,
    isSelected: false,
    count: 0,
    onPress: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render bot type name', () => {
    const { getByText } = render(<BotTypeCard {...defaultProps} />);
    expect(getByText('BREACHER')).toBeTruthy();
  });

  it('should show bot count', () => {
    const { getByText } = render(<BotTypeCard {...defaultProps} count={5} />);
    expect(getByText('5')).toBeTruthy();
  });

  it('should handle selection state', () => {
    const { getByTestId } = render(<BotTypeCard {...defaultProps} isSelected={true} />);
    expect(getByTestId('bot-card')).toHaveStyle({
      borderColor: expect.any(String)
    });
  });

  it('should show locked state', () => {
    const { getByTestId, getByText } = render(<BotTypeCard {...defaultProps} isLocked={true} />);
    expect(getByTestId('lock-icon')).toBeTruthy();
    expect(getByText('LOCKED')).toBeTruthy();
  });

  it('should not call onPress when locked', () => {
    const { getByTestId } = render(<BotTypeCard {...defaultProps} isLocked={true} />);
    fireEvent.press(getByTestId('bot-card'));
    expect(defaultProps.onPress).not.toHaveBeenCalled();
  });

  it('should call onPress when unlocked', () => {
    const { getByTestId } = render(<BotTypeCard {...defaultProps} />);
    fireEvent.press(getByTestId('bot-card'));
    expect(defaultProps.onPress).toHaveBeenCalled();
  });
}); 