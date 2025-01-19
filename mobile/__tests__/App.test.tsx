/**
 * @format
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

jest.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: jest.fn(() => ({ token: null, isLoading: false })),
}));

import { useAuth } from '../src/context/AuthContext';

describe('App', () => {
  it('renders without crashing', () => {
    const result = render(<App />);
    expect(result).toBeTruthy();
  });

  it('renders LoginScreen by default', () => {
    const { getByText } = render(<App />);
    expect(getByText('WELCOME BACK!')).toBeTruthy();
  });

  it('renders TurfScreen when authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ token: 'fake-token', isLoading: false });
    const { getByText } = render(<App />);
    expect(getByText('DIGITAL BARRACKS')).toBeTruthy();
  });

  it('shows error boundary on crash', () => {
    (useAuth as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });
    const { getByText } = render(<App />);
    expect(getByText('SYSTEM_ERROR')).toBeTruthy();
  });

  it('handles loading state', () => {
    (useAuth as jest.Mock).mockReturnValue({ token: null, isLoading: true });
    const result = render(<App />);
    expect(result.toJSON()).toBeTruthy();
  });
});
