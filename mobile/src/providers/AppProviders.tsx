import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '../context/ThemeContext';
import { NetworkConnectivityProvider } from './NetworkConnectivityProvider';
import { TaskGuideHighlightProvider } from '../contexts/TaskGuideHighlightContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <ThemeProvider>
          <NetworkConnectivityProvider>
            <TaskGuideHighlightProvider>
              {children}
            </TaskGuideHighlightProvider>
          </NetworkConnectivityProvider>
        </ThemeProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
