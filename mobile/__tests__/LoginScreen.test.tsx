import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../src/screens/LoginScreen';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';

// Mock both auth context and api
jest.mock('../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../src/services/api', () => ({
  api: {
    login: jest.fn(),
  },
}));

// Mock the AuthProvider wrapper
const mockAuthProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

describe('LoginScreen', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful API response
    (api.login as jest.Mock).mockResolvedValue({
      token: 'fake-token',
      user: { handle: 'testuser' }
    });
    
    // Mock auth context with all required values
    (useAuth as jest.Mock).mockReturnValue({
      login: jest.fn().mockResolvedValue(undefined),
      token: null,
      user: null,
      logout: jest.fn(),
    });
  });

  it('submits login form with correct credentials', async () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen />,
      { wrapper: mockAuthProvider }
    );

    // Fill in the form
    fireEvent.changeText(getByPlaceholderText('HANDLE'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('ACCESS_KEY'), 'password123');

    // Submit the form
    fireEvent.press(getByText('JACK_IN'));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        handle: 'testuser',
        accessKey: 'password123'
      });
    });
  });

  it('toggles between login and register forms', () => {
    const { getByText, queryByPlaceholderText } = render(
      <LoginScreen />,
      { wrapper: mockAuthProvider }
    );

    // Initially should be in login mode
    expect(queryByPlaceholderText('HANDLE')).toBeTruthy();
    expect(queryByPlaceholderText('ACCESS_KEY')).toBeTruthy();
    expect(queryByPlaceholderText('ENTER_EMAIL')).toBeFalsy();

    // Toggle to register mode
    fireEvent.press(getByText('NEW_IDENTITY (SIGN_UP)'));

    // Should now show register form fields
    expect(queryByPlaceholderText('ENTER_EMAIL')).toBeTruthy();
    expect(queryByPlaceholderText('SELECT_HANDLE')).toBeTruthy();
    expect(queryByPlaceholderText('SET_ACCESS_KEY')).toBeTruthy();
    expect(queryByPlaceholderText('VERIFY_ACCESS_KEY')).toBeTruthy();

    // Toggle back to login mode
    fireEvent.press(getByText('EXISTING_IDENTITY (SIGN_IN)'));

    // Should show login form fields again
    expect(queryByPlaceholderText('HANDLE')).toBeTruthy();
    expect(queryByPlaceholderText('ACCESS_KEY')).toBeTruthy();
    expect(queryByPlaceholderText('ENTER_EMAIL')).toBeFalsy();
  });

  it('displays error message on login failure', async () => {
    // Mock API to reject with an error
    (api.login as jest.Mock).mockRejectedValueOnce(new Error('Invalid credentials'));

    const { getByPlaceholderText, getByText, findByText } = render(
      <LoginScreen />,
      { wrapper: mockAuthProvider }
    );

    // Fill in the form
    fireEvent.changeText(getByPlaceholderText('HANDLE'), 'testuser');
    fireEvent.changeText(getByPlaceholderText('ACCESS_KEY'), 'wrongpassword');

    // Submit the form
    fireEvent.press(getByText('JACK_IN'));

    // Wait for and verify error message
    const errorMessage = await findByText('ACCESS_DENIED: Invalid credentials');
    expect(errorMessage).toBeTruthy();
  });

  it('disables submit button until form is valid', () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen />,
      { wrapper: mockAuthProvider }
    );

    const getSubmitButton = () => getByText('JACK_IN').parent!;
    
    // Initially button should be disabled
    expect(getSubmitButton().props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: 'rgba(0, 255, 65, 0.05)' })
    );

    // Fill handle only
    fireEvent.changeText(getByPlaceholderText('HANDLE'), 'testuser');
    expect(getSubmitButton().props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: 'rgba(0, 255, 65, 0.05)' })
    );

    // Fill access key
    fireEvent.changeText(getByPlaceholderText('ACCESS_KEY'), 'password123');
    expect(getSubmitButton().props.style).not.toContainEqual(
      expect.objectContaining({ backgroundColor: 'rgba(0, 255, 65, 0.05)' })
    );

    // Clear handle
    fireEvent.changeText(getByPlaceholderText('HANDLE'), '');
    expect(getSubmitButton().props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: 'rgba(0, 255, 65, 0.05)' })
    );
  });

  it('displays correct welcome message for login and register modes', () => {
    const { getByText } = render(
      <LoginScreen />,
      { wrapper: mockAuthProvider }
    );

    // Initially in login mode
    expect(getByText('WELCOME BACK!')).toBeTruthy();

    // Switch to register mode
    fireEvent.press(getByText('NEW_IDENTITY (SIGN_UP)'));
    expect(getByText('WELCOME!')).toBeTruthy();

    // Switch back to login mode
    fireEvent.press(getByText('EXISTING_IDENTITY (SIGN_IN)'));
    expect(getByText('WELCOME BACK!')).toBeTruthy();
  });
}); 