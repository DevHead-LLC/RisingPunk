// Utility to reset all RTK Query API caches
// This avoids circular imports by not importing the APIs directly
export const resetAllApiCaches = (api: any) => {
  console.log('🔍 RESET UTILS: Clearing all RTK Query caches to prevent data leakage');
  
  // Reset each API cache using their reducer paths
  api.dispatch({ type: 'api/resetApiState' });
  api.dispatch({ type: 'authApi/resetApiState' });
  api.dispatch({ type: 'balanceApi/resetApiState' });
  api.dispatch({ type: 'botsApi/resetApiState' });
  api.dispatch({ type: 'mapApi/resetApiState' });
  api.dispatch({ type: 'battleApi/resetApiState' });
  api.dispatch({ type: 'preferencesApi/resetApiState' });
  api.dispatch({ type: 'antivirusApi/resetApiState' });
  api.dispatch({ type: 'rentalHousingApi/resetApiState' });
  api.dispatch({ type: 'researchFeaturesApi/resetApiState' });
};
