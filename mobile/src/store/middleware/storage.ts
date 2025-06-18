import AsyncStorage from '@react-native-async-storage/async-storage';
import { createListenerMiddleware } from '@reduxjs/toolkit';

const STORAGE_KEY = 'redux-persist';

// Create listener middleware for persistence
export const storageListener = createListenerMiddleware();

// Listen for state changes and persist to AsyncStorage
storageListener.startListening({
  predicate: (action) => {
    // Only persist certain actions (we'll customize this per slice)
    return action.type.startsWith('ui/') || 
           action.type.startsWith('auth/') || 
           action.type.startsWith('balance/');
  },
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState();
    
    // Only persist specific parts of state
    const stateToPersist = {
      ui: state.ui,
      auth: state.auth,
      balance: state.balance,
    };
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  },
});

// Function to rehydrate state from AsyncStorage
export const rehydrateState = async () => {
  try {
    const persistedState = await AsyncStorage.getItem(STORAGE_KEY);
    if (persistedState) {
      return JSON.parse(persistedState);
    }
  } catch (error) {
    console.warn('Failed to rehydrate state:', error);
  }
  return undefined;
};

// Function to clear persisted state
export const clearPersistedState = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear persisted state:', error);
  }
}; 