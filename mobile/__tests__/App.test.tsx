/**
 * @format
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

jest.mock('../src/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ token: null, isLoading: false }),
}));

describe('App', () => {
  it('renders without crashing', () => {
    const result = render(<App />);
    expect(result).toBeTruthy();
  });
});
