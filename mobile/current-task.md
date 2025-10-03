# Shield Expiry Issue - Other Account Views

## Problem
When User A shields, User B can see the shield from their account. However, when User A's shield expires, User B continues to see User A as shielded indefinitely, even days/weeks later. The shield appears permanent from other accounts' viewpoints.

## Root Cause Analysis
1. **Shield expiry only happens on the shielding user's side** - The `/api/antivirus-shield/status` endpoint only checks and deactivates shields for the authenticated user (lines 344-350 in server.ts)

2. **Map data uses stale shield status** - The map endpoint (`/api/map/:name`) fetches all users' shield data once and caches it (lines 61, 194-196 in map.ts). It doesn't check if shields have expired for other users.

3. **No real-time updates for other users** - The `updateTileShieldStatus` function in HackMapScreen.tsx only updates when explicitly called, but there's no mechanism to detect when other users' shields expire.

## Current Flow
- User A shields → Shield data stored in database
- User B views map → Map endpoint fetches User A's shield data (shows as active)
- User A's shield expires → Only User A's shield status gets updated when they check their own status
- User B continues to see User A as shielded because map data is never refreshed

## Solution Implemented ✅
1. **Created ShieldService** - Centralized shield expiry logic in `/server/src/services/ShieldService.ts`
2. **Updated map endpoint** - Now checks and updates all users' shield statuses when map is loaded
3. **Updated shield status endpoints** - Both `/api/antivirus-shield/status` and `/api/users/shield-status/:userId` now use ShieldService
4. **Eliminated duplicate logic** - All shield expiry checking now goes through the centralized service

## Key Changes Made
- **ShieldService.ts**: New service with methods for checking/updating single or multiple user shield statuses
- **map.ts**: Map endpoint now calls `ShieldService.checkAndUpdateMultipleShieldStatuses()` before returning map data
- **server.ts**: Shield status endpoint now uses `ShieldService.checkAndUpdateShieldStatus()`
- **userRoutes.ts**: User shield status endpoint now uses `ShieldService.checkAndUpdateShieldStatus()`

## How It Works Now
1. When any user loads the map, ALL users' shield statuses are checked for expiry
2. Expired shields are automatically deactivated in the database
3. Map data reflects the current (updated) shield status for all users
4. Other accounts will immediately see when shields have expired
5. No duplicate logic - all shield expiry goes through ShieldService

## Testing
- Created test script: `/server/test-shield-expiry.js`
- Tests verify expired shields are deactivated and active shields remain active
- Tests multiple users scenario to ensure proper batch processing

## Result
✅ **FIXED**: Other accounts now see real-time shield status updates. When User A's shield expires, User B will immediately see User A as unshielded when viewing the map, without needing to wait for User A to log in.
