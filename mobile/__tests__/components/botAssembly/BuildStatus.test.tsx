import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildStatus } from '../../../src/components/botAssembly/BuildStatus';
import { BotType } from '../../../src/types/bots';

describe('BuildStatus', () => {
  const defaultProps = {
    selectedType: 'breacher' as BotType,
    quantity: '5',
    botCost: 1
  };

  it('should display selected bot type', () => {
    const { getByText } = render(<BuildStatus {...defaultProps} />);
    expect(getByText('breacher')).toBeTruthy();
  });

  it('should display correct total cost calculation', () => {
    const { getByText } = render(<BuildStatus {...defaultProps} />);
    expect(getByText('$5')).toBeTruthy();
  });

  it('should display N/A when no bot type is selected', () => {
    const { getAllByText } = render(
      <BuildStatus {...defaultProps} selectedType={null} />
    );
    expect(getAllByText('N/A')).toHaveLength(2);
  });

  it('should handle invalid quantity input', () => {
    const { getByText } = render(
      <BuildStatus {...defaultProps} quantity="invalid" />
    );
    expect(getByText('$0')).toBeTruthy();
  });

  it('should format large numbers with commas', () => {
    const { getByText } = render(
      <BuildStatus {...defaultProps} quantity="1000" />
    );
    expect(getByText('$1,000')).toBeTruthy();
  });
}); 