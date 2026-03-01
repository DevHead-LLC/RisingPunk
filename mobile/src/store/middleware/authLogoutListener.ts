/**
 * Listener that turns the plain action { type: 'auth/logout' } into dispatching the logoutUser thunk.
 * API layers (baseApi, authApi, balanceApi, etc.) dispatch 'auth/logout' to avoid circular imports;
 * only the thunk (logoutUser) runs the real logout (clear storage, reset caches, fulfilled reducer).
 */
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { logoutUser } from '../slices/authSlice';
import { clearPersistedTurfNavState } from '../../utils/turfNavStatePersistence';

export const authLogoutListener = createListenerMiddleware();

authLogoutListener.startListening({
  predicate: (action) => action.type === 'auth/logout',
  effect: async (_action, listenerApi) => {
    listenerApi.dispatch(logoutUser());
  },
});

// Account switch clears Redux state but does not run logoutUser; clear persisted turf nav so next user doesn't restore previous user's screen.
authLogoutListener.startListening({
  predicate: (action) => action.type === 'auth/handleAccountSwitched',
  effect: async () => {
    await clearPersistedTurfNavState();
  },
});
