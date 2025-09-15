# Current Task: Profile Screen Experience Update Issue

## Problem
When attacking NPCs on the HackMapScreen, the ProfileScreen information (experience, level) is not automatically updating after battle completion. The user has to manually refresh or restart the app to see updated experience and level ups.

## Root Cause Analysis
- ProfileScreen uses `useGetProfileQuery` which caches data with `['User']` tag
- Battle completion updates experience/level on server via `BattleRewardService` and `LevelingService`
- Client cache is not invalidated when battle ends, so ProfileScreen shows stale data
- Battle completion flow in `BattleEndOverlay` and `TurfScreen` only invalidates map cache, not user profile cache

## Solution Implemented
1. **BattleEndOverlay.tsx**: Added cache invalidation for User tag when battle ends
   - Added `useAppDispatch` and `authApi` imports
   - Added `useEffect` to invalidate `['User']` cache tags when `battleEndData` is available
   - This ensures profile data is refreshed immediately when battle completes

2. **TurfScreen.tsx**: Added User cache invalidation when returning from battle
   - Added `authApi` import
   - Added `dispatch(authApi.util.invalidateTags(['User']))` in battle close handler
   - This ensures profile data is refreshed even if user navigates directly to profile

## Technical Details
- Server correctly updates user experience/level via `LevelingService.applyExperience()`
- Server stores processed rewards in battle document for client response
- Client receives battle end data with experience gained and level up information
- Cache invalidation triggers fresh API call to `/api/users/profile` endpoint
- ProfileScreen automatically re-renders with updated data from fresh API response

## Testing Status
- Changes implemented and ready for testing
- No linting errors introduced
- Solution follows existing patterns in codebase for cache invalidation
