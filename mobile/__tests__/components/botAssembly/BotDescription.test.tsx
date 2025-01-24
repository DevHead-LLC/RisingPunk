import React from 'react';
import { render } from '@testing-library/react-native';
import { BotDescription } from '../../../src/components/botAssembly/BotDescription';

describe('BotDescription', () => {
  it('should render breacher description', () => {
    const { getByText } = render(<BotDescription type="breacher" />);
    expect(getByText(/Specialized in breaking through/)).toBeTruthy();
  });

  it('should render guardian description', () => {
    const { getByText } = render(<BotDescription type="guardian" />);
    expect(getByText(/Defensive specialist/)).toBeTruthy();
  });

  it('should render phreak description', () => {
    const { getByText } = render(<BotDescription type="phreak" />);
    expect(getByText(/High-speed infiltration/)).toBeTruthy();
  });

  it('should show bot stats', () => {
    const { getByText } = render(<BotDescription type="breacher" />);
    expect(getByText(/Attack:/)).toBeTruthy();
    expect(getByText(/Defense:/)).toBeTruthy();
    expect(getByText(/Speed:/)).toBeTruthy();
  });

  // Test for accessibility
  it('should have accessible labels', () => {
    const { getByLabelText } = render(<BotDescription type="breacher" />);
    expect(getByLabelText(/bot description/i)).toBeTruthy();
    expect(getByLabelText(/bot statistics/i)).toBeTruthy();
  });
}); 