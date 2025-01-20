import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildTimer } from '../../../src/components/botAssembly/BuildTimer';

describe('BuildTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultProps = {
    quantity: 5,
    buildTimePerUnit: 1000,
    progress: 40,
  };

  it('should display correct progress count', () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />);
    // At 40% progress of 5 total = 2 bots built
    expect(getByText('2/5')).toBeTruthy();
  });

  it('should display time remaining', () => {
    const { getByText } = render(<BuildTimer {...defaultProps} />);
    // With 60% remaining of 5 bots at 1000ms each = 3000ms = 3s
    expect(getByText('3s remaining')).toBeTruthy();
  });

  it('should handle zero quantity', () => {
    const { getByText } = render(
      <BuildTimer {...defaultProps} quantity={0} progress={0} />
    );
    expect(getByText('0/0')).toBeTruthy();
  });

  it('should handle 100% progress', () => {
    const { getByText } = render(
      <BuildTimer {...defaultProps} progress={100} />
    );
    expect(getByText('5/5')).toBeTruthy();
    expect(getByText('0s remaining')).toBeTruthy();
  });
}); 