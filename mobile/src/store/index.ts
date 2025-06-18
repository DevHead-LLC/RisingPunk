import { configureStore } from '@reduxjs/toolkit';
import uiSlice from './slices/uiSlice';

// Import slices (will be added in later phases)
// import authSlice from './slices/authSlice';
// import balanceSlice from './slices/balanceSlice';
// import botsSlice from './slices/botsSlice';
// import battleSlice from './slices/battleSlice';
// import mapSlice from './slices/mapSlice';

// Import APIs (will be added in later phases)
// import { authApi } from './api/authApi';
// import { botsApi } from './api/botsApi';
// import { balanceApi } from './api/balanceApi';
// import { battleApi } from './api/battleApi';
// import { mapApi } from './api/mapApi';

export const store = configureStore({
  reducer: {
    // Slices (will be added in later phases)
    // auth: authSlice,
    // balance: balanceSlice,
    // bots: botsSlice,
    // battle: battleSlice,
    ui: uiSlice,
    // map: mapSlice,
    
    // APIs (will be added in later phases)
    // [authApi.reducerPath]: authApi.reducer,
    // [botsApi.reducerPath]: botsApi.reducer,
    // [balanceApi.reducerPath]: balanceApi.reducer,
    // [battleApi.reducerPath]: battleApi.reducer,
    // [mapApi.reducerPath]: mapApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['some.path.to.ignore'],
      },
    })
    // Add API middleware (will be added in later phases)
    // .concat(authApi.middleware)
    // .concat(botsApi.middleware)
    // .concat(balanceApi.middleware)
    // .concat(battleApi.middleware)
    // .concat(mapApi.middleware)
    ,
  devTools: __DEV__,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 