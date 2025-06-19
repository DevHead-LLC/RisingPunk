import React from 'react';
import { COLORS } from './src/styles/theme';
import { AppProviders } from './src/providers/AppProviders';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import AppContent from './src/components/AppContent';

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
