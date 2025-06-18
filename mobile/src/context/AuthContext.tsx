import React, { createContext, useContext, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  unlockHackRig, 
  loadStoredAuth,
  clearError,
  type User 
} from '../store/slices/authSlice';

interface AuthState {
  token: string | null;
  user: User | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  unlockHackRig: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { token, user, isLoading, error } = useAppSelector((state) => state.auth);

  // Load stored auth on mount
  useEffect(() => {
    dispatch(loadStoredAuth());
  }, [dispatch]);

  const login = async (token: string, user: User) => {
    // This is now handled by the Redux thunk, but we keep the interface
    // The actual login should use loginUser thunk directly
    throw new Error('Use loginUser thunk instead of this method');
  };

  const logout = async () => {
    await dispatch(logoutUser()).unwrap();
  };

  const unlockHackRigAction = async () => {
    await dispatch(unlockHackRig()).unwrap();
  };

  // Don't render until we've checked for stored auth
  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      login, 
      logout, 
      isLoading,
      unlockHackRig: unlockHackRigAction 
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