import { configureStore } from '@reduxjs/toolkit';
import uiSlice from './slices/uiSlice';
import authSlice from './slices/authSlice';
import { baseApi } from './api/baseApi';
import { authApi } from './api/authApi';
import { storageListener } from './middleware/storage';
import balanceSlice from './slices/balanceSlice';
import { balanceApi } from './api/balanceApi';
import botsSlice from './slices/botsSlice';
import { botsApi } from './api/botsApi';

import mapSlice from './slices/mapSlice';
import { mapApi } from './api/mapApi';
import { battleApi } from './api/battleApi';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    balance: balanceSlice,
    bots: botsSlice,

    map: mapSlice,
    ui: uiSlice,

    [baseApi.reducerPath]: baseApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [balanceApi.reducerPath]: balanceApi.reducer,
    [botsApi.reducerPath]: botsApi.reducer,
    [mapApi.reducerPath]: mapApi.reducer,
    [battleApi.reducerPath]: battleApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          // RTK Query authApi actions
          'authApi/executeQuery/fulfilled',
          'authApi/executeQuery/rejected',
          'authApi/executeQuery/pending',
          // RTK Query balanceApi actions
          'balanceApi/executeQuery/fulfilled',
          'balanceApi/executeQuery/rejected',
          'balanceApi/executeQuery/pending',
          // RTK Query botsApi actions
          'botsApi/executeQuery/fulfilled',
          'botsApi/executeQuery/rejected',
          'botsApi/executeQuery/pending',
          // RTK Query mapApi actions
          'mapApi/executeQuery/fulfilled',
          'mapApi/executeQuery/rejected',
          'mapApi/executeQuery/pending',
          // RTK Query battleApi actions
          'battleApi/executeQuery/fulfilled',
          'battleApi/executeQuery/rejected',
          'battleApi/executeQuery/pending',
        ],
        ignoredActionPaths: [
          'payload.timestamp',
          'meta.baseQueryMeta.request',
          'meta.baseQueryMeta.response',
        ],
        ignoredPaths: [
          'some.path.to.ignore',
          'authApi.queries',
          'authApi.mutations',
          'balanceApi.queries',
          'balanceApi.mutations',
          'botsApi.queries',
          'botsApi.mutations',
          'mapApi.queries',
          'mapApi.mutations',
          'battleApi.queries',
          'battleApi.mutations',
        ],
      },
    })
    .prepend(storageListener.middleware)
    .concat(baseApi.middleware)
    .concat(authApi.middleware)
    .concat(balanceApi.middleware)
    .concat(botsApi.middleware)
    .concat(mapApi.middleware)
    .concat(battleApi.middleware),
  devTools: __DEV__,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
