**Expected Result**: Profile screen will now immediately show updated handle after successful username change

## App Refresh Fix ✅
**Problem**: On app refresh, onboarding and handle selection modal appear even when database shows they shouldn't

**Root Cause**: App relying on stale local storage data instead of fresh database verification
- **Location**: `mobile/src/store/slices/authSlice.ts` - `loadStoredAuth` thunk
- **Issue**: On refresh, app loads stored user data without verifying current database state
- **Result**: UI shows incorrect states based on outdated local data

**Solution**: Implemented database-first verification system with additional safety measures
- **Before**: Load stored token + user data, set UI states based on stored data
- **After**: Load stored token, verify with database, get fresh user data, set UI states based on current database state
- **New Endpoint**: Added `/api/auth/verify-token` to verify token and return current user data
- **Safety Flag**: Added `isInitialized` flag to prevent onboarding reducers from running before database verification is complete
- **How It Works**: 
  1. App loads stored token on refresh
  2. Immediately calls `/api/auth/verify-token` to verify token validity
  3. Gets fresh user data from database (including current `onboardingCompleted` and `needsHandleSelection`)
  4. Sets all UI states based on fresh database data, not stored data
  5. Updates local storage with fresh data
  6. Sets `isInitialized = true` to allow onboarding flow to proceed
  7. Onboarding reducers check `isInitialized` before making state changes

**Expected Result**: On app refresh, UI states will always match current database state - no more incorrect onboarding or handle selection modals
