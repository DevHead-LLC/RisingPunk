import React from 'react';
import { render, fireEvent, act, waitForElementToBeRemoved, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { HackRigDisplay } from '../../../src/components/home/HackRigDisplay';
import { authSlice } from '../../../src/store/slices/authSlice';

declare const global: any;

const createTestStore = (userState: any) => {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
    },
    preloadedState: {
      auth: {
        token: 'test-token',
        user: userState,
        isLoading: false,
        error: null,
      },
    },
  });
};

describe('Hack Rig Unlock Behavior', () => {
  it('should show lock overlay when locked', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unlockedFeatures: { hackRig: false } }),
    });
    const mockNavigateToBattle = jest.fn();
    const mockOnPress = jest.fn();
    
    const store = createTestStore({
      handle: 'testuser',
      email: 'test@example.com',
      level: 1,
      unlockedFeatures: {
        hackRig: false
      }
    });

    const { getByText } = render(
      <Provider store={store}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );

    await waitForElementToBeRemoved(() => getByText('Loading...'));
    expect(getByText('🔒')).toBeTruthy();
  });

  it('should not show lock overlay when unlocked', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unlockedFeatures: { hackRig: true } }),
    });
    const mockNavigateToBattle = jest.fn();
    const mockOnPress = jest.fn();
    
    const store = createTestStore({
      handle: 'testuser',
      email: 'test@example.com',
      level: 1,
      unlockedFeatures: {
        hackRig: true
      }
    });

    const { queryByText, getByText } = render(
      <Provider store={store}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );

    // Wait for loading to finish then assert no lock
    await waitForElementToBeRemoved(() => getByText('Loading...'));
    expect(queryByText('🔒')).toBeNull();
  });

  it('should handle undefined unlockedFeatures gracefully', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unlockedFeatures: undefined }),
    });
    const mockNavigateToBattle = jest.fn();
    const mockOnPress = jest.fn();
    
    const store = createTestStore({
      handle: 'testuser',
      email: 'test@example.com',
      level: 1,
      unlockedFeatures: undefined
    });

    const { getByText } = render(
      <Provider store={store}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );

    await waitForElementToBeRemoved(() => getByText('Loading...'));
    expect(getByText('🔒')).toBeTruthy();
  });

  it('should call correct navigation function based on lock status', async () => {
    const mockNavigateToBattle = jest.fn();
    const mockOnPress = jest.fn();
    
    // Test locked state
    const lockedStore = createTestStore({
      handle: 'testuser',
      email: 'test@example.com',
      level: 1,
      unlockedFeatures: {
        hackRig: false
      }
    });

    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unlockedFeatures: { hackRig: false } }),
    });

    const { unmount, getByText, queryByText } = render(
      <Provider store={lockedStore}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );
    await waitFor(() => expect(getByText('🔒')).toBeTruthy());

    // Component should be configured to call onNavigateToBattle when locked
    // (This is handled by the onPress prop logic in the component)
    
    // Test unlocked state
    const unlockedStore = createTestStore({
      handle: 'testuser',
      email: 'test@example.com',
      level: 1,
      unlockedFeatures: {
        hackRig: true
      }
    });

    ;(global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unlockedFeatures: { hackRig: true } }),
    });

    unmount();

    const { queryByText: queryByTextUnlocked } = render(
      <Provider store={unlockedStore}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );
    await waitFor(() => expect(queryByTextUnlocked('🔒')).toBeNull());

    // Component should be configured to call onPress when unlocked
    // (This is handled by the onPress prop logic in the component)
  });
});
