import React from 'react';
import { render } from '@testing-library/react-native';
import { BotDescription } from '../../../src/components/botAssembly/BotDescription';

describe('BotDescription', () => {
  it('should render breacher description', () => {
    const { getByText } = render(<BotDescription type="breacher" />);
    expect(getByText('Fast-moving assault units, specialized in penetrating network defenses')).toBeTruthy();
  });

  it('should render guardian description', () => {
    const { getByText } = render(<BotDescription type="guardian" />);
    expect(getByText('Heavy defensive units, forming the backbone of your digital army')).toBeTruthy();
  });

  it('should render phreak description', () => {
    const { getByText } = render(<BotDescription type="phreak" />);
    expect(getByText('Long-range disruption specialists, attacking from network shadows')).toBeTruthy();
  });

  it('should handle unknown bot type gracefully', () => {
    // @ts-expect-error Testing invalid input
    const { getByTestId } = render(<BotDescription type="invalid" />);
    expect(getByTestId('bot-description')).toHaveTextContent('');
  });
}); 