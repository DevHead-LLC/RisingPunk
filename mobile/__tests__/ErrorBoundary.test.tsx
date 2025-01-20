import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ErrorBoundary } from '../src/components/common/ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <TestComponent text="Normal content" />
      </ErrorBoundary>
    );
    expect(getByText('Normal content')).toBeTruthy();
  });

  it('renders error message when error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(getByText('SYSTEM_ERROR')).toBeTruthy();
  });
});

const TestComponent = ({ text }: { text: string }) => <Text>{text}</Text>; 