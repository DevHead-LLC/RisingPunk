import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TurfScreen } from '../src/screens/TurfScreen';
import { useAuth } from '../src/context/AuthContext';
import { BalanceProvider } from '../src/context/BalanceContext';
import { BotsProvider } from '../src/context/BotsContext';

// Mock auth context
jest.mock('../src/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockLogout = jest.fn();

describe('TurfScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      logout: mockLogout
    });
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

  it('calls logout when disconnect button is pressed', () => {
    const { getByText } = render(<TurfScreen />, { wrapper });
    fireEvent.press(getByText('DISCONNECT'));
    expect(mockLogout).toHaveBeenCalled();
  });
}); 