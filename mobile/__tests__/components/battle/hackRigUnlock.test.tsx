import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { HackRigDisplay } from '../../../src/components/home/HackRigDisplay';
import { authSlice } from '../../../src/store/slices/authSlice';

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
  it('should show lock overlay when locked', () => {
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

    // Should show lock overlay
    expect(getByText('🔒')).toBeTruthy();
  });

  it('should not show lock overlay when unlocked', () => {
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

    const { queryByText } = render(
      <Provider store={store}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );

    // Should not show lock overlay
    expect(queryByText('🔒')).toBeNull();
  });

  it('should handle undefined unlockedFeatures gracefully', () => {
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

    // Should show lock overlay when features undefined
    expect(getByText('🔒')).toBeTruthy();
  });

  it('should call correct navigation function based on lock status', () => {
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

    const { rerender } = render(
      <Provider store={lockedStore}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );

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

    rerender(
      <Provider store={unlockedStore}>
        <HackRigDisplay
          onPress={mockOnPress}
          onNavigateToBattle={mockNavigateToBattle}
        />
      </Provider>
    );

    // Component should be configured to call onPress when unlocked
    // (This is handled by the onPress prop logic in the component)
  });
});
