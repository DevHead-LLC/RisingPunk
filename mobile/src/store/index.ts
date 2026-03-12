import { configureStore } from '@reduxjs/toolkit';
import uiSlice from './slices/uiSlice';
import authSlice from './slices/authSlice';
import { baseApi } from './api/baseApi';
import { authApi } from './api/authApi';
import { storageListener } from './middleware/storage';
import { authLogoutListener } from './middleware/authLogoutListener';
import balanceSlice from './slices/balanceSlice';
import { balanceApi } from './api/balanceApi';
import botsSlice from './slices/botsSlice';
import { botsApi } from './api/botsApi';
import preferencesSlice from './slices/preferencesSlice';

import mapSlice from './slices/mapSlice';
import { mapApi } from './api/mapApi';
import { battleApi } from './api/battleApi';
import { preferencesApi } from './api/preferencesApi';
import { antivirusApi } from './api/antivirusApi';
import { rentalHousingApi } from './api/rentalHousingApi';
import { researchFeaturesApi } from './api/researchFeaturesApi';
import { leaderboardApi } from './api/leaderboardApi';
import { userGuideApi } from './api/userGuideApi';
import { privateMessagesApi } from './api/privateMessagesApi';
import { dailyHaulApi } from './api/dailyHaulApi';
import { packetBreachApi } from './api/packetBreachApi';
import { raceConditionHeistApi } from './api/raceConditionHeistApi';
import { binaryBankCrackApi } from './api/binaryBankCrackApi';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    balance: balanceSlice,
    bots: botsSlice,
    preferences: preferencesSlice,

    map: mapSlice,
    ui: uiSlice,

    [baseApi.reducerPath]: baseApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [balanceApi.reducerPath]: balanceApi.reducer,
    [botsApi.reducerPath]: botsApi.reducer,
    [mapApi.reducerPath]: mapApi.reducer,
    [battleApi.reducerPath]: battleApi.reducer,
    [preferencesApi.reducerPath]: preferencesApi.reducer,
    [antivirusApi.reducerPath]: antivirusApi.reducer,
    [rentalHousingApi.reducerPath]: rentalHousingApi.reducer,
    [researchFeaturesApi.reducerPath]: researchFeaturesApi.reducer,
    [leaderboardApi.reducerPath]: leaderboardApi.reducer,
    [userGuideApi.reducerPath]: userGuideApi.reducer,
    [privateMessagesApi.reducerPath]: privateMessagesApi.reducer,
    [dailyHaulApi.reducerPath]: dailyHaulApi.reducer,
    [packetBreachApi.reducerPath]: packetBreachApi.reducer,
    [raceConditionHeistApi.reducerPath]: raceConditionHeistApi.reducer,
    [binaryBankCrackApi.reducerPath]: binaryBankCrackApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    })
    .prepend(storageListener.middleware)
    .prepend(authLogoutListener.middleware)
    .concat(baseApi.middleware)
    .concat(authApi.middleware)
    .concat(balanceApi.middleware)
    .concat(botsApi.middleware)
    .concat(mapApi.middleware)
    .concat(battleApi.middleware)
    .concat(preferencesApi.middleware)
    .concat(antivirusApi.middleware)
    .concat(rentalHousingApi.middleware)
    .concat(researchFeaturesApi.middleware)
    .concat(leaderboardApi.middleware)
    .concat(userGuideApi.middleware)
    .concat(privateMessagesApi.middleware)
    .concat(dailyHaulApi.middleware)
    .concat(packetBreachApi.middleware)
    .concat(raceConditionHeistApi.middleware)
    .concat(binaryBankCrackApi.middleware),
  devTools: __DEV__,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
