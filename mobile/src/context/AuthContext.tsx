import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

interface AuthState {
  token: string | null;
  user: {
    handle: string;
    email: string;
    level: number;
    unlockedFeatures: {
      hackRig: boolean;
    };
  } | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: AuthState['user']) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  unlockHackRig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    user: null
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        
        if (storedToken && storedUser) {
          setAuthState({
            token: storedToken,
            user: JSON.parse(storedUser),
          });
        }
      } catch (error) {
        // Silent error handling
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (token: string, user: AuthState['user']) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setAuthState({ token, user });
    } catch (error) {
      // Silent error handling
      throw error;
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setAuthState({ token: null, user: null });
  };

  const unlockHackRig = async () => {
    if (!authState.token || !authState.user) return;

    try {
      const response = await fetch(`${API_URL}/users/unlock-hack-rig`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to unlock hack rig');

      const updatedUser = await response.json();
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error unlocking hack rig:', error);
      throw error;
    }
  };

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <AuthContext.Provider value={{ 
      ...authState, 
      login, 
      logout, 
      isLoading,
      unlockHackRig 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 