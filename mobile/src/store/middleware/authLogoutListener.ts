/**
 * Listener that turns the plain action { type: 'auth/logout' } into dispatching the logoutUser thunk.
 * API layers (baseApi, authApi, balanceApi, etc.) dispatch 'auth/logout' to avoid circular imports;
 * only the thunk (logoutUser) runs the real logout (clear storage, reset caches, fulfilled reducer).
 */
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { logoutUser } from '../slices/authSlice';

export const authLogoutListener = createListenerMiddleware();

authLogoutListener.startListening({
  predicate: (action) => action.type === 'auth/logout',
  effect: async (_action, listenerApi) => {
    listenerApi.dispatch(logoutUser());
  },
});
