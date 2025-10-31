import React, { useEffect } from 'react';
import { LogBox, StatusBar, Platform } from 'react-native';

import { AppProviders } from './src/providers/AppProviders';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import AppContent from './src/components/AppContent';

// Disable all warning banners
LogBox.ignoreAllLogs(true);

function App(): React.JSX.Element {
  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setHidden(true, 'fade');
    }
  }, []);

  return (
    <AppProviders>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AppProviders>
  );
}

export default App;
