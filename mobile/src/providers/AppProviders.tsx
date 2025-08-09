import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        {children}
      </Provider>
    </GestureHandlerRootView>
  );
}
