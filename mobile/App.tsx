import React from 'react';
import { LogBox } from 'react-native';

import { AppProviders } from './src/providers/AppProviders';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import AppContent from './src/components/AppContent';

// Disable all warning banners
LogBox.ignoreAllLogs(true);

function App(): React.JSX.Element {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AppProviders>
  );
}

export default App;
