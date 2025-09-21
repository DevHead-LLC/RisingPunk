import { authApi } from './authApi';
import { balanceApi } from './balanceApi';
import { botsApi } from './botsApi';
import { mapApi } from './mapApi';

export const clearAllApiCaches = (api: any) => {
  console.log('🔍 CACHE UTILS: Clearing all RTK Query caches to prevent data leakage');
  api.dispatch(authApi.util.resetApiState());
  api.dispatch(balanceApi.util.resetApiState());
  api.dispatch(botsApi.util.resetApiState());
  api.dispatch(mapApi.util.resetApiState());
};
