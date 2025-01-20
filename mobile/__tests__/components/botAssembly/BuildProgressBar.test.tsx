import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildProgressBar } from '../../../src/components/botAssembly/BuildProgressBar';

describe('BuildProgressBar', () => {
  it('should render with 0% progress', () => {
    const { getByTestId } = render(<BuildProgressBar progress={0} />);
    const progressFill = getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual({ width: '0%' });
  });

  it('should render with 50% progress', () => {
    const { getByTestId } = render(<BuildProgressBar progress={50} />);
    const progressFill = getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual({ width: '50%' });
  });

  it('should render with 100% progress', () => {
    const { getByTestId } = render(<BuildProgressBar progress={100} />);
    const progressFill = getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual({ width: '100%' });
  });

  it('should handle decimal progress values', () => {
    const { getByTestId } = render(<BuildProgressBar progress={33.33} />);
    const progressFill = getByTestId('progress-fill');
    expect(progressFill.props.style).toContainEqual({ width: '33.33%' });
  });
}); 