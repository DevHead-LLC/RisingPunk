import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
});

export const useNetworkConnectivity = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkConnectivity must be used within NetworkConnectivityProvider');
  }
  return context;
};

interface NetworkConnectivityProviderProps {
  children: ReactNode;
}

export const NetworkConnectivityProvider: React.FC<NetworkConnectivityProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    // Dynamically import NetInfo to avoid immediate native module errors
    let unsubscribe: (() => void) | null = null;
    
    const setupNetInfo = async () => {
      try {
        const NetInfo = await import('@react-native-community/netinfo');
        
        unsubscribe = NetInfo.default.addEventListener(state => {
          setIsConnected(state.isConnected ?? true);
          setIsInternetReachable(state.isInternetReachable ?? true);
        });

        const state = await NetInfo.default.fetch();
        setIsConnected(state.isConnected ?? true);
        setIsInternetReachable(state.isInternetReachable ?? true);
      } catch (error) {
        console.warn('NetInfo not available, connectivity checking disabled:', error);
        // Keep default connected state if NetInfo fails
      }
    };

    setupNetInfo();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value: NetworkContextType = {
    isConnected,
    isInternetReachable,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};
