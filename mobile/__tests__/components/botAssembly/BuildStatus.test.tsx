import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildStatus } from '../../../src/components/botAssembly/BuildStatus';

describe('BuildStatus', () => {
  const defaultProps = {
    selectedType: 'breacher' as const,
    quantity: '5',
    botCost: 1,
  };

  it('should display N/A when no bot type is selected', () => {
    const { getAllByText } = render(
      <BuildStatus {...defaultProps} selectedType={null} />
    );
    expect(getAllByText('N/A')).toHaveLength(2);
  });

  it('should display correct total cost calculation', () => {
    const { getByText } = render(<BuildStatus {...defaultProps} />);
    expect(getByText('$5')).toBeTruthy();
  });

  it('should display selected bot type', () => {
    const { getByText } = render(<BuildStatus {...defaultProps} />);
    expect(getByText('breacher')).toBeTruthy();
  });
}); 