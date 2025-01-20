import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TurfScreen } from '../src/screens/TurfScreen';
import { useAuth } from '../src/context/AuthContext';
import { BalanceProvider } from '../src/context/BalanceContext';
import { BotsProvider } from '../src/context/BotsContext';

// Mock auth context
jest.mock('../src/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    token: 'fake-token'
  }))
}));

// Mock HomeScreen
jest.mock('../src/screens/HomeScreen', () => {
  const HomeScreen = () => null;
  return { HomeScreen };
});

describe('TurfScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BalanceProvider>
      <BotsProvider>
        {children}
      </BotsProvider>
    </BalanceProvider>
  );

  it('renders initial turf view correctly', () => {
    const { getByText } = render(<TurfScreen />, { wrapper });
    expect(getByText('HOME')).toBeTruthy();
    expect(getByText('DIGITAL BARRACKS')).toBeTruthy();
  });

  it('changes screen to hackRig when HOME is pressed', () => {
    const { getByText } = render(<TurfScreen />, { wrapper });
    fireEvent.press(getByText('HOME'));
    // We need to verify the screen state changed to 'hackRig'
    // This might require exposing the screen state or finding another way to verify the navigation
  });
}); 