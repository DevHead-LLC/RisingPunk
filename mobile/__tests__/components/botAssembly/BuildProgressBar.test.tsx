import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildProgressBar } from '../../../src/components/botAssembly/BuildProgressBar';

describe('BuildProgressBar', () => {
  it('should render progress bar with correct width', () => {
    const { getByTestId } = render(<BuildProgressBar progress={50} />);
    const progressFill = getByTestId('progress-fill');
    expect(progressFill).toHaveStyle({ width: '50%' });
  });

  it('should handle zero progress', () => {
    const { getByTestId } = render(<BuildProgressBar progress={0} />);
    const progressFill = getByTestId('progress-fill');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });

  it('should handle complete progress', () => {
    const { getByTestId } = render(<BuildProgressBar progress={100} />);
    const progressFill = getByTestId('progress-fill');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('should clamp progress between 0 and 100', () => {
    const { getByTestId: getOverflow } = render(<BuildProgressBar progress={150} />);
    const { getByTestId: getUnderflow } = render(<BuildProgressBar progress={-50} />);
    
    expect(getOverflow('progress-fill')).toHaveStyle({ width: '100%' });
    expect(getUnderflow('progress-fill')).toHaveStyle({ width: '0%' });
  });
}); 